import { supabase } from './supabase';
import { CreateResumeRequest, UpdateResumeRequest, Resume } from '@ai-resume-copilot/shared-types';

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
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/resumes/${id}`, {
        method: 'DELETE',
        headers
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
  }
};
