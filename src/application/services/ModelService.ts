import type { PrismaClient } from '../../generated/prisma/client.js';
import type {
  CompletionRequest,
  CompletionResponse,
  IModelProvider,
  StreamChunk,
  TokenUsage,
} from '../../domain/providers/IModelProvider.js';

interface ModelCallContext {
  userId: string;
  sessionId?: string;
}

interface ModelServiceOptions {
  providerName: string;
}

export class InvalidModelSessionError extends Error {
  constructor() {
    super('Session not found for current user');
  }
}

export class ModelService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly provider: IModelProvider,
    private readonly options: ModelServiceOptions,
  ) {}

  async complete(context: ModelCallContext, request: CompletionRequest): Promise<CompletionResponse> {
    const sessionId = await this.resolveSessionId(context);
    const modelRequest = await this.createModelRequest(context.userId, sessionId, request.model);
    const response = await this.provider.complete(request);

    await this.createUsageEvent(context.userId, modelRequest.id, response.model, response.usage);

    return response;
  }

  async *stream(context: ModelCallContext, request: CompletionRequest): AsyncIterable<StreamChunk> {
    const sessionId = await this.resolveSessionId(context);
    const modelRequest = await this.createModelRequest(context.userId, sessionId, request.model);
    let finalUsage: TokenUsage | undefined;
    let finalModel = request.model;

    try {
      for await (const chunk of this.provider.stream(request)) {
        finalUsage = chunk.usage ?? finalUsage;
        finalModel = chunk.model ?? finalModel;
        yield chunk;
      }
    } finally {
      if (finalUsage) {
        await this.createUsageEvent(context.userId, modelRequest.id, finalModel, finalUsage);
      }
    }
  }

  private async resolveSessionId(context: ModelCallContext): Promise<string> {
    if (context.sessionId) {
      const session = await this.prisma.session.findFirst({
        where: { id: context.sessionId, userId: context.userId },
        select: { id: true },
      });

      if (!session) {
        throw new InvalidModelSessionError();
      }

      return session.id;
    }

    const conversation = await this.prisma.conversation.create({
      data: { userId: context.userId },
      select: { id: true },
    });

    const session = await this.prisma.session.create({
      data: {
        conversationId: conversation.id,
        userId: context.userId,
      },
      select: { id: true },
    });

    return session.id;
  }

  private async createModelRequest(userId: string, sessionId: string, model: string) {
    return this.prisma.modelRequest.create({
      data: {
        userId,
        sessionId,
        provider: this.options.providerName,
        model,
      },
      select: { id: true },
    });
  }

  private async createUsageEvent(
    userId: string,
    modelRequestId: string,
    model: string,
    usage: TokenUsage,
  ): Promise<void> {
    await this.prisma.usageEvent.create({
      data: {
        userId,
        modelRequestId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        promptCacheHitTokens: usage.promptCacheHitTokens,
        promptCacheMissTokens: usage.promptCacheMissTokens,
        provider: this.options.providerName,
        model,
      },
    });
  }
}
