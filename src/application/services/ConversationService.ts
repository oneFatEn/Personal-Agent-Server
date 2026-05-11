import type { PrismaClient } from '../../generated/prisma/client.js';
import type { MessageRole, ToolCall } from '../../domain/providers/IModelProvider.js';

export class ConversationAccessError extends Error {
  constructor() {
    super('Conversation not found for current user');
  }
}

interface SessionRef {
  conversationId: string;
  sessionId: string;
}

interface AppendMessageOptions {
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export class ConversationService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrCreateSession(userId: string, conversationId?: string): Promise<SessionRef> {
    if (conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });

      if (!conversation) {
        throw new ConversationAccessError();
      }

      const session = await this.prisma.session.create({
        data: { conversationId, userId },
        select: { id: true },
      });

      return { conversationId, sessionId: session.id };
    }

    const conversation = await this.prisma.conversation.create({
      data: { userId },
      select: { id: true },
    });
    const session = await this.prisma.session.create({
      data: { conversationId: conversation.id, userId },
      select: { id: true },
    });

    return { conversationId: conversation.id, sessionId: session.id };
  }

  async appendMessage(
    sessionId: string,
    userId: string,
    role: MessageRole,
    content: string,
    options: AppendMessageOptions = {},
  ) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { conversationId: true },
    });

    if (!session) {
      throw new ConversationAccessError();
    }

    const message = await this.prisma.conversationMessage.create({
      data: {
        sessionId,
        userId,
        role,
        content,
        toolCallId: options.toolCallId,
        toolCalls: options.toolCalls ? JSON.stringify(options.toolCalls) : undefined,
      },
    });

    await this.prisma.conversation.update({
      where: { id: session.conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async getRecentMessages(sessionId: string, userId: string, limit: number) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { conversationId: true },
    });

    if (!session) {
      throw new ConversationAccessError();
    }

    const messages = await this.prisma.conversationMessage.findMany({
      where: {
        userId,
        session: { conversationId: session.conversationId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }
}
