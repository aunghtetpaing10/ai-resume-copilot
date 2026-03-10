import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { supabase, createAuthClient } from '../lib/supabase';
import { Profile } from '@ai-resume-copilot/shared-types';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: any;
    profile: Profile;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          success: false,
          error: { code: 'APP_002', message: 'Missing or invalid authorization header' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Verify token with Supabase Auth
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        return reply.code(401).send({
          success: false,
          error: { code: 'APP_002', message: 'Invalid or expired token' },
        });
      }

      // Create an authenticated client to fetch the profile so RLS passes
      const authClient = createAuthClient(token);
      const { data: profile } = await authClient
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      request.user = data.user;
      request.profile = profile || { id: data.user.id, tier: 'free' }; // fallback

    } catch (err) {
      app.log.error(err);
      return reply.code(401).send({
        success: false,
        error: { code: 'APP_002', message: 'Authentication failed' },
      });
    }
  });
};

export default fp(authPlugin);
