import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import healthRoutes from './routes/health';
import resumesRoutes from './routes/resumes';
import aiRoutes from './routes/ai';
import authPlugin from './plugins/auth';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Security headers
  await app.register(helmet);

  // CORS
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    credentials: true,
  });

  // Rate limiting (Layer 1)
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Swagger docs
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'AI Resume Copilot API',
        description: 'REST API for generating and tailoring resumes',
        version: '0.1.0',
      },
      host: 'localhost:8080',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
  });

  // Multipart uploads (for PDF/DOCX resumes)
  await app.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });

  // Auth plugin
  await app.register(authPlugin);

  // Routes
  app.register(async (api) => {
    api.register(healthRoutes, { prefix: '/health' });
    api.register(resumesRoutes, { prefix: '/resumes' });
    api.register(aiRoutes, { prefix: '/ai' });

    // Protected auth testing route
    api.get('/auth/me', { preValidation: [app.authenticate] }, async (request, _reply) => {
      return { success: true, user: request.user, profile: request.profile };
    });
  }, { prefix: '/api/v1' });

  // Add a hook to log requests
  app.addHook('onRequest', (request, _reply, done) => {
    request.log.info({ req: request.headers['x-request-id'] }, 'incoming request');
    done();
  });

  return app;
}
