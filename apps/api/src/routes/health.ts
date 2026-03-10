import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Future: Add a /ready endpoint that checks DB and Redis connections
  app.get('/ready', async (request, reply) => {
    // TODO: Implement dependency checks
    return { status: 'ready' };
  });
};

export default healthRoutes;
