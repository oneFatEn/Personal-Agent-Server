import { createHash } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { Message, ToolDefinition, ToolCall } from '../../domain/providers/IModelProvider.js';
import { ModelService } from './ModelService.js';
import { ConversationService } from './ConversationService.js';

const DEFAULT_MESSAGE_LIMIT = 50;
const DEFAULT_TOKEN_THRESHOLD = 6000;
const COMPRESSED_MESSAGE_LIMIT = 10;
const DEFAULT_MODEL = 'deepseek-chat';

export class ContextAssembler {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly conversationService: ConversationService,
    private readonly modelService: ModelService,
    private readonly tools: ToolDefinition[],
    private readonly messageLimit = DEFAULT_MESSAGE_LIMIT,
    private readonly tokenThreshold = DEFAULT_TOKEN_THRESHOLD,
  ) {}

  async assemble(sessionId: string, userId: string): Promise<Message[]> {
    const persistedMessages = await this.conversationService.getRecentMessages(sessionId, userId, this.messageLimit);
    const summary = await this.prisma.contextSummary.findFirst({
      where: { sessionId, userId },
      orderBy: { createdAt: 'desc' },
      select: { content: true },
    });
    const system = this.buildSystemPrompt(summary?.content);
    const messages = [system, ...persistedMessages.map((message) => ({
      role: message.role,
      content: message.content,
      toolCallId: message.toolCallId ?? undefined,
      toolCalls: parseToolCalls(message.toolCalls),
    }))] satisfies Message[];

    if (this.estimateTokens(messages) <= this.tokenThreshold) {
      return messages;
    }

    const compressibleMessages = persistedMessages.slice(0, -COMPRESSED_MESSAGE_LIMIT);
    const summaryResponse = await this.modelService.complete(
      { userId, sessionId },
      {
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: '请将以下对话压缩成保留关键事实、用户偏好、待办和未决问题的简洁摘要。',
          },
          {
            role: 'user',
            content: compressibleMessages
              .map((message) => `${message.role}: ${message.content}`)
              .join('\n'),
          },
        ],
      },
    );

    await this.prisma.contextSummary.create({
      data: {
        userId,
        sessionId,
        content: summaryResponse.content,
      },
    });
    await this.prisma.contextAssemblyEvent.create({
      data: {
        userId,
        sessionId,
        stablePrefixHash: createHash('sha256')
          .update(compressibleMessages.map((message) => message.id).join('|'))
          .digest('hex'),
      },
    });

    const compressedSystem = this.buildSystemPrompt(summaryResponse.content);
    return [
      compressedSystem,
      ...persistedMessages.slice(-COMPRESSED_MESSAGE_LIMIT).map((message) => ({
        role: message.role,
        content: message.content,
        toolCallId: message.toolCallId ?? undefined,
        toolCalls: parseToolCalls(message.toolCalls),
      })),
    ];
  }

  private buildSystemPrompt(summary?: string): Message {
    const toolList = this.tools.map((tool) => `- ${tool.function.name}: ${tool.function.description}`).join('\n');
    const basePrompt = [
      '你是一个个人 agent。你需要清晰理解用户意图，必要时调用工具完成记忆和任务管理，再给出简洁、可执行的回复。',
      '',
      '## 可用工具',
      toolList,
      '',
      '## 行为规范',
      '- 只在有明确收益时调用工具。',
      '- 工具结果是事实来源，回复前先吸收观察结果。',
      '- 不要编造已经写入或读取的数据。',
    ].join('\n');

    return {
      role: 'system',
      content: summary ? `${basePrompt}\n\n## 对话摘要\n${summary}` : basePrompt,
    };
  }

  private estimateTokens(messages: Message[]): number {
    return Math.ceil(messages.reduce((total, message) => total + message.content.length, 0) / 4);
  }
}

function parseToolCalls(value: string | null): ToolCall[] | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as ToolCall[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
