import request from 'supertest';
import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';
import { supabase } from '../../lib/supabase';

const mockAuthClient = {
  from: jest.fn(),
  storage: { from: jest.fn() }
};

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
  createAuthClient: jest.fn(() => mockAuthClient)
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
    
    // Default fallback mock config for the auth.ts middleware
    mockAuthClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'test-user-id', tier: 'free' }, error: null })
    });
  });

  it('GET /api/v1/resumes - should return user resumes', async () => {
    const mockResumes = [{ id: '1', title: 'Test Resume' }];
    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const orderMock = jest.fn().mockResolvedValue({ data: mockResumes, error: null });

    // Since the auth middleware makes a `.single()` call to query profiles and the route
    // makes a `.order()` call to query resumes, we mock the `from` to handle both.
    mockAuthClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'test-user-id' }, error: null }) };
      }
      return { select: selectMock, eq: eqMock, order: orderMock };
    });

    const response = await request(app.server)
      .get('/api/v1/resumes')
      .set('Authorization', 'Bearer dummy-token')
      .expect(200);

    expect(response.body.resumes).toEqual(mockResumes);
    expect(mockAuthClient.from).toHaveBeenCalledWith('resumes');
    expect(eqMock).toHaveBeenCalledWith('user_id', 'test-user-id');
  });

  it('POST /api/v1/resumes - should create a blank resume', async () => {
    const newResume = { id: 'new-id', title: 'My New Resume' };
    const insertMock = jest.fn().mockReturnThis();
    const selectMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockResolvedValue({ data: newResume, error: null });

    mockAuthClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'test-user-id' }, error: null }) };
      }
      return { insert: insertMock, select: selectMock, single: singleMock };
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

    mockAuthClient.from.mockImplementation((table: string) => {
       if (table === 'profiles') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'test-user-id' }, error: null }) };
      }
      return chainMock;
    });

    const response = await request(app.server)
      .patch('/api/v1/resumes/1')
      .set('Authorization', 'Bearer dummy-token')
      .send({ title: 'Updated Title' })
      .expect(200);

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

    chainMock.eq.mockImplementation(() => chainMock);
    chainMock.delete.mockImplementation(() => chainMock);

    const removeStorageMock = jest.fn().mockResolvedValue({ error: null });

    mockAuthClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'test-user-id' }, error: null }) };
      }
      return chainMock;
    });
    mockAuthClient.storage.from.mockReturnValue({ remove: removeStorageMock });

    await request(app.server)
      .delete('/api/v1/resumes/1')
      .set('Authorization', 'Bearer dummy-token')
      .expect(204);

    expect(mockAuthClient.from).toHaveBeenCalledWith('resumes');
  });
});
