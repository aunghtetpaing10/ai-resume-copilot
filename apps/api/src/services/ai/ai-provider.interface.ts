import { ResumeContent } from '@ai-resume-copilot/shared-types';

export interface ATSScoreResult {
  score: number;
  feedback: string[];
}

export interface IAIProvider {
  parseResume(rawText: string): Promise<ResumeContent>;
  tailorResume(resume: ResumeContent, jobDescription: string): Promise<ResumeContent>;
  scoreATS(resume: ResumeContent, jobDescription: string): Promise<ATSScoreResult>;
}
