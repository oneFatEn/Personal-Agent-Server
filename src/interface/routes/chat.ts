import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { InvalidModelSessionError, ModelService } from '../../application/services/ModelService.js';
import { config } from '../../config.js';
import { DeepSeekProvider } from '../../infrastructure/providers/DeepSeekProvider.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { Errors } from '../utils/errors.js';
import { fail, ok } from '../utils/response.js';

const completionBodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1),
  })).min(1),
  model: z.string().min(1).default('deepseek-chat'),
  stream: z.boolean().default(false),
  sessionId: z.string().min(1).optional(),
});

const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/chat/completions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parseResult = completionBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      const err = Errors.validationError(parseResult.error.issues[0]?.message);
      return fail(reply, err.httpStatus, err.appCode, err.message);
    }

    const body = parseResult.data;
    if (body.sessionId) {
      const session = await prisma.session.findFirst({
        where: { id: body.sessionId, userId: request.userScope.userId },
        select: { id: true },
      });

      if (!session) {
        const err = Errors.validationError('Session not found for current user');
        return fail(reply, err.httpStatus, err.appCode, err.message);
      }
    }

    try {
      const modelService = new ModelService(
        prisma,
        new DeepSeekProvider(config.DEEPSEEK_API_KEY),
        { providerName: 'deepseek' },
      );

      if (!body.stream) {
        const response = await modelService.complete(
          { userId: request.userScope.userId, sessionId: body.sessionId },
          { model: body.model, messages: body.messages },
        );
        return ok(reply, response);
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });

      for await (const chunk of modelService.stream(
        { userId: request.userScope.userId, sessionId: body.sessionId },
        { model: body.model, messages: body.messages },
      )) {
        if (chunk.delta) {
          reply.raw.write(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`);
        }
      }

      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();
      return reply;
    } catch (error) {
      if (error instanceof InvalidModelSessionError) {
        const err = Errors.validationError(error.message);
        return fail(reply, err.httpStatus, err.appCode, err.message);
      }

      if (reply.raw.headersSent) {
        reply.raw.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
        reply.raw.end();
        return reply;
      }

      throw error;
    }
  });
};

export default chatRoutes;
