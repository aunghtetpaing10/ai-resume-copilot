# AI Resume Copilot

> AI-powered resume generator and optimizer — tailor your resume to any job description, get ATS scores, and land more interviews.

## What It Does

- **Generate** a professional resume from your career data using AI
- **Tailor** your existing resume to any job description in seconds
- **Score** your resume against ATS systems and get actionable feedback
- **Export** polished resumes as PDF or DOCX

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (Vercel) |
| API Server | Node.js + Fastify + TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (Email + Google OAuth) |
| File Storage | Supabase Storage |
| Job Queue | BullMQ + Redis (Upstash) |
| AI Provider | Google Gemini (abstracted — swappable) |
| PDF Export | Puppeteer |
| Deployment | Railway (API + Workers) + Vercel (Frontend) |

## Monorepo Structure

```
ai-resume-copilot/
├── apps/
│   ├── api/          # Fastify REST API
│   ├── worker/       # BullMQ job workers
│   └── web/          # React frontend
├── packages/
│   └── shared-types/ # Shared TypeScript types
├── docker-compose.yml
└── README.md
```

## Architecture

A **hybrid architecture**: Supabase handles auth, PostgreSQL, and file storage while a dedicated Node.js service handles business logic and AI orchestration. Heavy AI tasks (resume generation, tailoring, ATS scoring) run asynchronously through BullMQ workers.

```
React Client → Fastify API → BullMQ Queue → AI Workers → Gemini API
                    ↕                              ↕
              Supabase (Auth, DB, Storage)   Supabase Realtime (notifications)
```

## Getting Started

```bash
# Clone the repo
git clone https://github.com/aunghtetpaing10/ai-resume-copilot.git
cd ai-resume-copilot

# Install dependencies
npm install

# Copy environment variables
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env

# Start local services (Redis)
docker-compose up -d

# Run in development
npm run dev
```

## System Design

See [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) for the full architecture documentation.

## License

MIT
