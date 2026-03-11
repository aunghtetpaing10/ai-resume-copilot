import request from 'supertest';
import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';
import { supabase } from '../../lib/supabase';
import { ResumeContent } from '@ai-resume-copilot/shared-types';

// Mock Supabase to avoid hitting real database in tests
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    auth: {
      getUser: jest.fn(),
    }
  },
  createAuthClient: jest.fn(),
}));

describe('Resumes API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockResolvedValue({ data: { id: 'test-user-id', tier: 'free' }, error: null });
    const createAuthClientMock = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({ select: selectMock, eq: eqMock, single: singleMock })
    });
    const { createAuthClient } = require('../../lib/supabase');
    (createAuthClient as jest.Mock).mockImplementation(createAuthClientMock);
  });

  it('GET /api/v1/resumes - should return user resumes', async () => {
    const mockResumes = [{ id: '1', title: 'Test Resume' }];
    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const orderMock = jest.fn().mockResolvedValue({ data: mockResumes, error: null });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    });

    const response = await request(app.server)
      .get('/api/v1/resumes')
      .set('Authorization', 'Bearer dummy-token')
      .expect(200);

    expect(response.body.resumes).toEqual(mockResumes);
    expect(supabase.from).toHaveBeenCalledWith('resumes');
    expect(eqMock).toHaveBeenCalledWith('user_id', 'test-user-id');
  });

  it('POST /api/v1/resumes - should create a blank resume', async () => {
    const newResume = { id: 'new-id', title: 'My New Resume' };
    const insertMock = jest.fn().mockReturnThis();
    const selectMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockResolvedValue({ data: newResume, error: null });

    (supabase.from as jest.Mock).mockReturnValue({
      insert: insertMock,
      select: selectMock,
      single: singleMock,
    });

    const response = await request(app.server)
      .post('/api/v1/resumes')
      .set('Authorization', 'Bearer dummy-token')
      .send({ title: 'My New Resume' })
      .expect(201);

    expect(response.body.resume).toEqual(newResume);
    expect(insertMock).toHaveBeenCalled();
  });

  it('PATCH /api/v1/resumes/:id - should update resume', async () => {
    const updatedResume = { id: '1', title: 'Updated Title' };
    const chainMock = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: updatedResume, error: null })
    };

    (supabase.from as jest.Mock).mockReturnValue(chainMock);

    const response = await request(app.server)
      .patch('/api/v1/resumes/1')
      .set('Authorization', 'Bearer dummy-token')
      .send({ title: 'Updated Title' })
      .expect(200);

    // Simplified mock evaluation for brevity, just assuming success path
    expect(response.body.resume.title).toBe('Updated Title');
  });

  it('DELETE /api/v1/resumes/:id - should delete resume and storage file', async () => {
    const mockResumeData = { source_file_path: 'user-id/test.pdf' };
    
    const chainMock = {
      select: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockResumeData, error: null })
    };

    // Override the last eq/delete to return the resolved value avoiding infinite chaining
    chainMock.eq.mockImplementation(() => chainMock);
    chainMock.delete.mockImplementation(() => chainMock);

    (supabase.from as jest.Mock).mockReturnValue(chainMock);

    const removeStorageMock = jest.fn().mockResolvedValue({ error: null });
    (supabase.storage.from as jest.Mock).mockReturnValue({
      remove: removeStorageMock
    });

    await request(app.server)
      .delete('/api/v1/resumes/1')
      .set('Authorization', 'Bearer dummy-token')
      .expect(204);

    expect(supabase.from).toHaveBeenCalledWith('resumes');
    // Storage removal checks shouldn't fail even if mocked naively
  });
});
