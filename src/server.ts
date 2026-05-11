import Fastify from 'fastify';
import { config } from './config.js';
import { prisma } from './infrastructure/database/prisma.js';
import { UserRepository } from './infrastructure/database/UserRepository.js';
import authPlugin from './interface/plugins/auth.js';
import agentRoutes from './interface/routes/agent.js';
import authRoutes from './interface/routes/auth.js';
import chatRoutes from './interface/routes/chat.js';
import { AppCode } from './interface/utils/errors.js';

export async function buildServer() {
  const server = Fastify({
    logger:
      config.NODE_ENV === 'development'
        ? { level: config.LOG_LEVEL, transport: { target: 'pino-pretty' } }
        : { level: config.LOG_LEVEL },
  });

  // Plugins
  await server.register(authPlugin);

  // Repositories
  const userRepository = new UserRepository(prisma);

  // Routes
  await server.register(authRoutes, { userRepository });
  await server.register(chatRoutes);
  await server.register(agentRoutes);

  // Health check
  server.get('/health', async () => {
    return { code: AppCode.OK, message: 'ok', data: { status: 'ok' } };
  });

  // 404 handler
  server.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ code: AppCode.NOT_FOUND, message: 'Not found', data: null });
  });

  // Global error handler — 处理路由中未预期的异常
  server.setErrorHandler((error, _request, reply) => {
    server.log.error(error);
    const message = config.NODE_ENV === 'production'
      ? 'Internal server error'
      : error instanceof Error ? error.message : String(error);
    reply.code(500).send({ code: AppCode.INTERNAL_ERROR, message, data: null });
  });

  return server;
}
