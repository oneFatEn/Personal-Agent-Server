import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AgentService } from '../../application/services/AgentService.js';
import { ContextAssembler } from '../../application/services/ContextAssembler.js';
import { ConversationAccessError, ConversationService } from '../../application/services/ConversationService.js';
import { ModelService } from '../../application/services/ModelService.js';
import { config } from '../../config.js';
import { toolRegistry } from '../../domain/agent/ToolRegistry.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { DeepSeekProvider } from '../../infrastructure/providers/DeepSeekProvider.js';
import { registerBuiltInTools } from '../../infrastructure/tools/index.js';
import { AppCode, Errors } from '../utils/errors.js';
import { fail, ok } from '../utils/response.js';

const agentRunBodySchema = z.object({
  message: z.string().trim().min(1),
  conversationId: z.string().min(1).optional(),
  stream: z.boolean().default(false),
});

const agentRoutes: FastifyPluginAsync = async (fastify) => {
  registerBuiltInTools(toolRegistry);

  fastify.post('/api/agent/run', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parseResult = agentRunBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      const err = Errors.validationError(parseResult.error.issues[0]?.message);
      return fail(reply, err.httpStatus, err.appCode, err.message);
    }

    const userId = request.userScope.userId;
    const body = parseResult.data;
    const conversationService = new ConversationService(prisma);
    const modelService = new ModelService(
      prisma,
      new DeepSeekProvider(config.DEEPSEEK_API_KEY),
      { providerName: 'deepseek' },
    );
    const contextAssembler = new ContextAssembler(
      prisma,
      conversationService,
      modelService,
      toolRegistry.toOpenAITools(),
    );
    const agentService = new AgentService(
      prisma,
      modelService,
      conversationService,
      contextAssembler,
      toolRegistry,
      config.AGENT_MAX_ITERATIONS,
    );

    try {
      const { conversationId, sessionId } = await conversationService.getOrCreateSession(userId, body.conversationId);
      await conversationService.appendMessage(sessionId, userId, 'user', body.message);

      if (!body.stream) {
        const content = await agentService.run(userId, sessionId, body.message);
        await conversationService.appendMessage(sessionId, userId, 'assistant', content);
        return ok(reply, { conversationId, sessionId, content });
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      reply.raw.write(`data: ${JSON.stringify({ type: 'session', conversationId, sessionId })}\n\n`);

      let content = '';
      for await (const event of agentService.stream(userId, sessionId, body.message)) {
        if (event.type === 'delta') {
          content += event.content;
        }
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      await conversationService.appendMessage(sessionId, userId, 'assistant', content);
      reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      reply.raw.end();
      return reply;
    } catch (error) {
      if (error instanceof ConversationAccessError) {
        return fail(reply, 403, AppCode.UNAUTHORIZED, error.message);
      }

      if (reply.raw.headersSent) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`);
        reply.raw.end();
        return reply;
      }

      throw error;
    }
  });
};

export default agentRoutes;
