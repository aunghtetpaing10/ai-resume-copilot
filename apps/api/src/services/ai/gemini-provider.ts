import { GoogleGenAI } from '@google/genai';
import { ResumeContent } from '@ai-resume-copilot/shared-types';
import { IAIProvider, ATSScoreResult } from './ai-provider.interface';
import { PARSE_RESUME_PROMPT, TAILOR_RESUME_PROMPT, SCORE_ATS_PROMPT } from './prompts';

const MODEL = 'gemini-3.1-flash-lite-preview';

// JSON Schema for ResumeContent — used by Gemini's structured output
const resumeContentSchema = {
  type: 'object' as const,
  properties: {
    personalInfo: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const },
        phone: { type: 'string' as const },
        location: { type: 'string' as const },
        linkedin: { type: 'string' as const },
        github: { type: 'string' as const },
        website: { type: 'string' as const },
      },
      required: ['name', 'email'],
    },
    summary: { type: 'string' as const },
    experience: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          company: { type: 'string' as const },
          title: { type: 'string' as const },
          startDate: { type: 'string' as const },
          endDate: { type: 'string' as const },
          current: { type: 'boolean' as const },
          bullets: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['company', 'title', 'startDate', 'bullets'],
      },
    },
    education: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          institution: { type: 'string' as const },
          degree: { type: 'string' as const },
          field: { type: 'string' as const },
          graduationDate: { type: 'string' as const },
          gpa: { type: 'string' as const },
        },
        required: ['institution', 'degree', 'field', 'graduationDate'],
      },
    },
    skills: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          category: { type: 'string' as const },
          items: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['category', 'items'],
      },
    },
    projects: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          description: { type: 'string' as const },
          techStack: { type: 'array' as const, items: { type: 'string' as const } },
          url: { type: 'string' as const },
        },
        required: ['name', 'description', 'techStack'],
      },
    },
    certifications: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          issuer: { type: 'string' as const },
          date: { type: 'string' as const },
        },
        required: ['name', 'issuer', 'date'],
      },
    },
  },
  required: ['personalInfo', 'experience', 'education', 'skills'],
};

const atsScoreSchema = {
  type: 'object' as const,
  properties: {
    score: { type: 'number' as const },
    feedback: { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: ['score', 'feedback'],
};

export class GeminiProvider implements IAIProvider {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async parseResume(rawText: string): Promise<ResumeContent> {
    const response = await this.ai.models.generateContent({
      model: MODEL,
      contents: `${PARSE_RESUME_PROMPT}\n\n--- RESUME TEXT ---\n${rawText}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: resumeContentSchema,
      },
    });

    return JSON.parse(response.text!) as ResumeContent;
  }

  async tailorResume(resume: ResumeContent, jobDescription: string): Promise<ResumeContent> {
    const response = await this.ai.models.generateContent({
      model: MODEL,
      contents: `${TAILOR_RESUME_PROMPT}\n\n--- CURRENT RESUME ---\n${JSON.stringify(resume, null, 2)}\n\n--- JOB DESCRIPTION ---\n${jobDescription}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: resumeContentSchema,
      },
    });

    return JSON.parse(response.text!) as ResumeContent;
  }

  async scoreATS(resume: ResumeContent, jobDescription: string): Promise<ATSScoreResult> {
    const response = await this.ai.models.generateContent({
      model: MODEL,
      contents: `${SCORE_ATS_PROMPT}\n\n--- RESUME ---\n${JSON.stringify(resume, null, 2)}\n\n--- JOB DESCRIPTION ---\n${jobDescription}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: atsScoreSchema,
      },
    });

    return JSON.parse(response.text!) as ATSScoreResult;
  }
}
