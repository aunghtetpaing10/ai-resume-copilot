import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase';
import { ResumeParserService } from '../services/resume-parser';
import { CreateResumeRequest, UpdateResumeRequest, ResumeContent } from '@ai-resume-copilot/shared-types';

export default async function (fastify: FastifyInstance) {
  // Apply auth preValidation to all routes in this plugin
  fastify.addHook('preValidation', fastify.authenticate);

  /**
   * Get all resumes for current user
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch resumes' });
    }

    return { resumes: data };
  });

  /**
   * Get single resume
   */
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', request.params.id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return reply.code(404).send({ error: 'Resume not found' });
    }

    return { resume: data };
  });

  /**
   * Create a blank resume
   */
  fastify.post('/', async (request: FastifyRequest<{ Body: CreateResumeRequest }>, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const defaultContent: ResumeContent = {
      personalInfo: { name: '', email: '' },
      experience: [],
      education: [],
      skills: []
    };

    const newResume = {
      user_id: userId,
      title: request.body.title || 'Untitled Resume',
      content: request.body.content || defaultContent,
      is_base: true
    };

    const { data, error } = await supabase
      .from('resumes')
      .insert(newResume)
      .select()
      .single();

    if (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create resume' });
    }

    return reply.code(201).send({ resume: data });
  });

  /**
   * Update resume content
   */
  fastify.patch('/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: UpdateResumeRequest }>, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const updates: any = { updated_at: new Date().toISOString() };
    if (request.body.title) updates.title = request.body.title;
    if (request.body.content) updates.content = request.body.content;

    const { data, error } = await supabase
      .from('resumes')
      .update(updates)
      .eq('id', request.params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update resume' });
    }

    if (!data) return reply.code(404).send({ error: 'Resume not found' });

    return { resume: data };
  });

  /**
   * Delete resume
   */
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    // 1. Get the resume to check if there is an associated source file
    const { data: resume } = await supabase
      .from('resumes')
      .select('source_file_path')
      .eq('id', request.params.id)
      .eq('user_id', userId)
      .single();

    if (!resume) return reply.code(404).send({ error: 'Resume not found' });

    // 2. Delete the record in the db
    const { error: dbError } = await supabase
      .from('resumes')
      .delete()
      .eq('id', request.params.id)
      .eq('user_id', userId);

    if (dbError) {
      request.log.error(dbError);
      return reply.code(500).send({ error: 'Failed to delete resume' });
    }

    // 3. Clean up the storage bucket if file exists
    if (resume.source_file_path) {
      const { error: storageError } = await supabase
        .storage
        .from('resumes')
        .remove([resume.source_file_path]);
        
      if (storageError) request.log.error(`Failed to delete storage file: ${storageError.message}`);
    }

    return reply.code(204).send();
  });

  /**
   * Upload and Parse a PDF/DOCX Resume
   */
  fastify.post('/upload', async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'No file uploaded' });

    const allowedMimeTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    
    if (!allowedMimeTypes.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'Invalid file type. Only PDF and DOCX are supported.' });
    }

    try {
      // Read the file buffer
      const buffer = await data.toBuffer();
      
      // Build unique file path inside the 'resumes' bucket
      const fileExt = data.filename.split('.').pop();
      const timestamp = new Date().getTime();
      const filePath = `${userId}/${timestamp}_${data.filename.replace(/[^a-zA-Z0-9_.-]/g, '')}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('resumes')
        .upload(filePath, buffer, {
          contentType: data.mimetype,
          upsert: false
        });

      if (uploadError) {
        request.log.error(uploadError);
        return reply.code(500).send({ error: 'Failed to upload file to storage' });
      }

      // Parse the document text
      const extractedText = await ResumeParserService.extractText(buffer, data.mimetype);

      // Create a new Resume record
      const defaultContent: ResumeContent = {
        personalInfo: { name: '', email: '' },
        summary: extractedText, // Save raw text to summary for MVP
        experience: [],
        education: [],
        skills: []
      };

      const newResume = {
        user_id: userId,
        title: data.filename,
        content: defaultContent,
        source_file_path: filePath,
        is_base: true
      };

      const { data: dbData, error: dbError } = await supabase
        .from('resumes')
        .insert(newResume)
        .select()
        .single();

      if (dbError) {
        request.log.error(dbError);
        // Best effort: cleanup storage if DB insertion failed
        await supabase.storage.from('resumes').remove([filePath]);
        return reply.code(500).send({ error: 'Failed to save resume record' });
      }

      return reply.code(201).send({ success: true, resumeId: dbData.id, resume: dbData });

    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'An error occurred during file processing' 
      });
    }
  });
}
