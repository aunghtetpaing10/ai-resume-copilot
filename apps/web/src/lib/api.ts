import { supabase } from './supabase';
import { CreateResumeRequest, UpdateResumeRequest, Resume, ResumeContent } from '@ai-resume-copilot/shared-types';

const API_BASE = '/api/v1';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json'
  };
}

export const api = {
  resumes: {
    async list(): Promise<Resume[]> {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/resumes`, { headers });
      if (!res.ok) throw new Error('Failed to fetch resumes');
      const data = await res.json();
      return data.resumes;
    },

    async get(id: string): Promise<Resume> {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/resumes/${id}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch resume');
      const data = await res.json();
      return data.resume;
    },

    async create(payload: CreateResumeRequest): Promise<Resume> {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/resumes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create resume');
      const data = await res.json();
      return data.resume;
    },

    async update(id: string, payload: UpdateResumeRequest): Promise<Resume> {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/resumes/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update resume');
      const data = await res.json();
      return data.resume;
    },

    async delete(id: string): Promise<void> {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/resumes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete resume');
    },

    async upload(file: File): Promise<Resume> {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/resumes/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
          // Let browser set Content-Type for FormData (including boundary)
        },
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload resume');
      const data = await res.json();
      return data.resume;
    }
  },

  ai: {
    async parse(rawText: string): Promise<ResumeContent> {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/ai/parse`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rawText })
      });
      if (!res.ok) throw new Error('Failed to parse resume');
      const data = await res.json();
      return data.content;
    },

    async tailor(resumeId: string, jobDescription: string): Promise<ResumeContent> {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/ai/tailor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resumeId, jobDescription })
      });
      if (!res.ok) throw new Error('Failed to tailor resume');
      const data = await res.json();
      return data.content;
    },

    async score(resumeId: string, jobDescription: string): Promise<{ score: number; feedback: string[] }> {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/ai/score`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resumeId, jobDescription })
      });
      if (!res.ok) throw new Error('Failed to score resume');
      return res.json();
    }
  }
};
