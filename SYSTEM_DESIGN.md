# System Design — AI Resume Copilot

> Full architecture documentation. See the [README](./README.md) for project overview.

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [API Design](#5-api-design)
6. [AI Integration Layer](#6-ai-integration-layer)
7. [Async Job Processing](#7-async-job-processing)
8. [Freemium & Rate Limiting](#8-freemium--rate-limiting)
9. [Production Considerations](#9-production-considerations)
10. [Development Phases](#10-development-phases)

---

## 1. Problem Statement

Job seekers spend hours customizing resumes for each application, often failing ATS filters due to missing keywords or poor formatting — not because they're underqualified.

**AI Resume Copilot** solves this by:
- Generating structured resumes from raw career data
- Tailoring existing resumes to specific job descriptions in seconds
- Explaining why a resume fails ATS and how to fix it

---

## 2. Architecture Overview

### Why Hybrid: Supabase + Custom Node.js Backend

Supabase provides: Auth, PostgreSQL, Storage, Row Level Security, Realtime.

A **separate Node.js service** is needed because Supabase Edge Functions have a ~60s execution limit and no native queue support. AI processing requires retries, workers, and queue management.

```
┌────────────────────────────────────────────┐
│           CLIENT LAYER                     │
│        React (Vite) → Vercel               │
└──────────────────┬─────────────────────────┘
                   │ HTTPS
┌──────────────────▼─────────────────────────┐
│            API LAYER                       │
│      Node.js + Fastify (Railway)           │
│  REST endpoints · JWT verification         │
│  Rate limiting · Job enqueueing            │
└──────────┬────────────────────┬────────────┘
           │                    │
┌──────────▼──────────┐ ┌──────▼──────────────────┐
│   SUPABASE LAYER    │ │    ASYNC JOB LAYER       │
│  PostgreSQL         │ │  BullMQ Workers          │
│  Auth (JWTs)        │ │  • Resume parser         │
│  Storage (files)    │ │  • AI generation         │
│  Realtime (WS)      │ │  • ATS scoring           │
│  Row Level Sec.     │ │  • Export (PDF/DOCX)     │
└─────────────────────┘ └──────────┬──────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Redis (Upstash)    │
                        │  BullMQ queues      │
                        │  Rate limit state   │
                        │  Idempotency keys   │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  AI PROVIDER LAYER  │
                        │  Google Gemini API  │
                        │  (abstracted)       │
                        └─────────────────────┘
```

### Data Flow: Resume Tailoring

```
User submits POST /resumes/:id/tailor
  → Validate JWT + check rate limit
  → Create ai_jobs record (status: queued)
  → Push job to BullMQ queue
  → Return { jobId, status: "queued" }

Worker (async):
  → Fetch resume content from DB
  → Call Gemini API
  → Validate and parse JSON response
  → Save tailored resume to DB
  → Update ai_jobs.status = completed
  → Supabase Realtime notifies client
```

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + Vite | Fast HMR, Vercel deployment |
| API Server | Node.js + Fastify | Faster than Express, native TypeScript, schema validation |
| Language | TypeScript | End-to-end type safety |
| Database | PostgreSQL (Supabase) | Relational, JSONB for flexible resume content |
| Auth | Supabase Auth | Email/password + OAuth, JWTs out of the box |
| File Storage | Supabase Storage | S3-compatible, integrated RLS |
| Job Queue | BullMQ | Redis-backed, retry logic, priority queues |
| Cache / Broker | Upstash Redis | Serverless Redis, free tier |
| AI Provider | Google Gemini | Cost-effective, abstracted behind interface |
| PDF Generation | Puppeteer | Headless Chrome, pixel-perfect PDF output |
| Resume Parsing | pdf-parse + mammoth.js | PDF and DOCX text extraction |
| Logging | Pino | Fastest Node.js structured logger |
| Error Tracking | Sentry | Industry standard, free tier |
| Deployment: API | Railway | Docker support, cheap, great DX |
| Deployment: Web | Vercel | Zero-config React deploys |
| CI/CD | GitHub Actions | Free, integrates with Railway + Vercel |

---

## 4. Database Schema

```sql
-- PROFILES: extends Supabase auth.users
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  avatar_url   TEXT,
  tier         TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RESUMES: the core document
CREATE TABLE resumes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  content          JSONB NOT NULL DEFAULT '{}',   -- structured resume data
  source_file_path TEXT,                           -- Supabase Storage path
  is_base          BOOLEAN NOT NULL DEFAULT true,
  parent_id        UUID REFERENCES resumes(id),    -- for tailored versions
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JOB_DESCRIPTIONS: stored JDs for tailoring
CREATE TABLE job_descriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  company     TEXT,
  raw_text    TEXT NOT NULL,
  keywords    TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI_JOBS: tracks all async AI processing tasks
CREATE TABLE ai_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,   -- 'generate' | 'tailor' | 'score' | 'export'
  status           TEXT NOT NULL DEFAULT 'queued',
                   -- 'queued' | 'processing' | 'completed' | 'failed'
  input_payload    JSONB NOT NULL,
  result_payload   JSONB,
  error_message    TEXT,
  attempts         INT NOT NULL DEFAULT 0,
  idempotency_key  TEXT UNIQUE,
  resume_id        UUID REFERENCES resumes(id),
  job_desc_id      UUID REFERENCES job_descriptions(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USAGE_LOGS: for freemium tracking
CREATE TABLE usage_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,    -- 'ai_generation' | 'ai_tailor' | 'export'
  ai_tokens   INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ATS_SCORES: computed ATS analysis results
CREATE TABLE ats_scores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id    UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_desc_id  UUID REFERENCES job_descriptions(id),
  score        INT NOT NULL,            -- 0-100
  breakdown    JSONB NOT NULL,
  suggestions  JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Resume Content JSONB Schema

```typescript
interface ResumeContent {
  personalInfo: {
    name: string; email: string; phone?: string;
    location?: string; linkedin?: string; github?: string;
  };
  summary?: string;
  experience: {
    company: string; title: string;
    startDate: string; endDate?: string; current?: boolean;
    bullets: string[];
  }[];
  education: {
    institution: string; degree: string;
    field: string; graduationDate: string; gpa?: string;
  }[];
  skills: { category: string; items: string[] }[];
  projects?: {
    name: string; description: string;
    techStack: string[]; url?: string;
  }[];
  certifications?: { name: string; issuer: string; date: string }[];
}
```

---

## 5. API Design

**Base URL**: `/api/v1`  
**Auth**: `Authorization: Bearer <supabase-jwt>` on all protected routes

```
RESUMES
  POST   /resumes               Create blank resume
  POST   /resumes/upload        Upload PDF/DOCX → parse → create
  GET    /resumes               List user's resumes
  GET    /resumes/:id           Get single resume
  PATCH  /resumes/:id           Update resume content
  DELETE /resumes/:id           Delete resume

AI FEATURES (async — returns jobId immediately)
  POST   /resumes/generate      Generate from structured input
  POST   /resumes/:id/tailor    Tailor to a job description
  POST   /resumes/:id/score     Run ATS scoring
  POST   /resumes/:id/export    Generate PDF/DOCX

JOB DESCRIPTIONS
  POST   /job-descriptions      Save JD + extract keywords
  GET    /job-descriptions      List saved JDs
  DELETE /job-descriptions/:id  Delete JD

ASYNC JOBS
  GET    /jobs/:jobId           Poll job status + result

USAGE
  GET    /usage                 Get current month's usage

HEALTH
  GET    /health                Liveness check
  GET    /health/ready          Readiness check (DB + Redis)
```

**Response shape:**
```json
// Success
{ "success": true, "data": {} }

// Async job queued
{ "success": true, "data": { "jobId": "uuid", "status": "queued" } }

// Error
{ "success": false, "error": { "code": "APP_004", "message": "Usage limit exceeded" } }
```

---

## 6. AI Integration Layer

### Provider Abstraction

```typescript
interface AIProvider {
  generateText(params: GenerateTextParams): Promise<AITextResult>;
  generateJSON<T>(params: GenerateJSONParams, schema: ZodSchema<T>): Promise<T>;
}

// Concrete implementations:
class GeminiProvider implements AIProvider { ... }
class OpenAIProvider implements AIProvider { ... }  // future
```

### AI Tasks

| Task | Input | Output |
|---|---|---|
| Parse Resume | Raw text (PDF/DOCX) | `ResumeContent` JSON |
| Generate Resume | Career data form | `ResumeContent` JSON |
| Tailor Resume | Resume + JD text | Modified `ResumeContent` JSON |
| Extract Keywords | JD text | `string[]` |
| ATS Score | Resume + JD | Score + breakdown + suggestions |

---

## 7. Async Job Processing

```
BullMQ Queues:
  resume:parse     — concurrency: 5
  resume:generate  — concurrency: 3
  resume:tailor    — concurrency: 3
  resume:score     — concurrency: 5
  resume:export    — concurrency: 2
```

**Worker Lifecycle:**
1. Pick up job → set `status = processing`
2. Call AI provider (30s timeout)
3. On success → save result → `status = completed` → Realtime push
4. On failure → BullMQ retry (exponential backoff, max 3 attempts)
5. After max attempts → `status = failed` → dead letter queue

**Client Notification:** Poll `GET /jobs/:jobId` every 3s OR subscribe via Supabase Realtime on the `ai_jobs` table.

---

## 8. Freemium & Rate Limiting

| Feature | Free | Pro |
|---|---|---|
| AI Generations | 3/month | Unlimited |
| Resume Tailoring | 5/month | Unlimited |
| ATS Scoring | 10/month | Unlimited |
| Exports | 5/month | Unlimited |
| Stored Resumes | 3 | Unlimited |

**Two-layer enforcement:**
- **Layer 1** — Redis sliding window: 100 req/min (unauthenticated), 300 req/min (authenticated)
- **Layer 2** — PostgreSQL usage query: checked before every AI job is queued

---

## 9. Production Considerations

| Concern | Approach |
|---|---|
| **Idempotency** | `Idempotency-Key` header on AI endpoints; keyed in `ai_jobs` table |
| **Logging** | Pino structured JSON logs; every request logs `requestId`, `userId`, `jobId` |
| **Error Tracking** | Sentry (free tier) |
| **AI Retries** | Exponential backoff on 429; single retry on 5xx; no retry on timeout |
| **Prompt Injection** | Sanitize all user content before injecting into prompts |
| **Observability** | BullMQ dashboard for queue health; Railway log drains |

**Error Codes:**
```
APP_001 — Validation error
APP_002 — Authentication failed
APP_003 — Authorization failed
APP_004 — Usage limit exceeded
APP_005 — AI provider error (retryable)
APP_006 — AI provider error (non-retryable)
APP_007 — File parsing error
APP_008 — Export generation error
```

---

## 10. Development Phases

| Week | Focus | Deliverable |
|---|---|---|
| 1 | Foundation | Monorepo, Docker, Supabase schema, auth middleware |
| 2 | Resume Core | CRUD endpoints, file upload, PDF/DOCX parsing |
| 3 | AI Foundation | AI abstraction layer, BullMQ setup, job tracking |
| 4 | Core AI Features | Resume generation, tailoring, keyword extraction |
| 5 | Advanced AI | ATS scoring, PDF export, version history |
| 6 | Freemium | Usage tracking, tier enforcement, error audit |
| 7 | Production | Logging, Sentry, CI/CD, Docker production builds |
| 8 | Deploy | Railway + Vercel deployment, load testing, demo |
