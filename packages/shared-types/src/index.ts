export interface ResumeContent {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  summary?: string;
  experience: {
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    graduationDate: string;
    gpa?: string;
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
  projects?: {
    name: string;
    description: string;
    techStack: string[];
    url?: string;
  }[];
  certifications?: {
    name: string;
    issuer: string;
    date: string;
  }[];
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  tier: 'free' | 'pro';
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  title: string;
  content: ResumeContent;
  source_file_path: string | null;
  is_base: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobDescription {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  raw_text: string;
  keywords: string[];
  created_at: string;
}

export type AIJobType = 'generate' | 'tailor' | 'score' | 'export';
export type AIJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface AIJob {
  id: string;
  user_id: string;
  type: AIJobType;
  status: AIJobStatus;
  input_payload: any;
  result_payload: any | null;
  error_message: string | null;
  attempts: number;
  idempotency_key: string | null;
  resume_id: string | null;
  job_desc_id: string | null;
  created_at: string;
  updated_at: string;
}
