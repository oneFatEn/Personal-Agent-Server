import type { PrismaClient } from '../../generated/prisma/client.js';
import type { ToolCall } from '../../domain/providers/IModelProvider.js';
import { ToolRegistry } from '../../domain/agent/ToolRegistry.js';
import { ConversationService } from './ConversationService.js';
import { ContextAssembler } from './ContextAssembler.js';
import { ModelService } from './ModelService.js';

const DEFAULT_MODEL = 'deepseek-chat';
const MAX_ITERATION_REPLY = '达到最大循环次数，请重新描述你的需求';

export type AgentStreamEvent =
  | { type: 'tool_call'; name: string }
  | { type: 'delta'; content: string };

export class AgentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly modelService: ModelService,
    private readonly conversationService: ConversationService,
    private readonly contextAssembler: ContextAssembler,
    private readonly toolRegistry: ToolRegistry,
    private readonly maxIterations: number,
  ) {}

  async run(userId: string, sessionId: string, _userMessage: string): Promise<string> {
    let finalContent = MAX_ITERATION_REPLY;

    for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
      const messages = await this.contextAssembler.assemble(sessionId, userId);
      const response = await this.modelService.complete(
        { userId, sessionId },
        {
          model: DEFAULT_MODEL,
          messages,
          tools: this.toolRegistry.toOpenAITools(),
        },
      );

      if (!response.toolCalls?.length) {
        finalContent = response.content;
        break;
      }

      await this.conversationService.appendMessage(sessionId, userId, 'assistant', response.content, {
        toolCalls: response.toolCalls,
      });
      await this.executeToolCalls(userId, sessionId, response.toolCalls);
    }

    return finalContent;
  }

  async *stream(userId: string, sessionId: string, userMessage: string): AsyncIterable<AgentStreamEvent> {
    let finalContent = MAX_ITERATION_REPLY;
    void userMessage;

    for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
      const messages = await this.contextAssembler.assemble(sessionId, userId);
      const response = await this.modelService.complete(
        { userId, sessionId },
        {
          model: DEFAULT_MODEL,
          messages,
          tools: this.toolRegistry.toOpenAITools(),
        },
      );

      if (!response.toolCalls?.length) {
        finalContent = response.content;
        break;
      }

      await this.conversationService.appendMessage(sessionId, userId, 'assistant', response.content, {
        toolCalls: response.toolCalls,
      });

      for (const toolCall of response.toolCalls) {
        yield { type: 'tool_call', name: toolCall.name };
      }

      await this.executeToolCalls(userId, sessionId, response.toolCalls);
    }

    if (finalContent) {
      yield { type: 'delta', content: finalContent };
    }
  }

  private async executeToolCalls(userId: string, sessionId: string, toolCalls: ToolCall[]): Promise<void> {
    for (const toolCall of toolCalls) {
      const input = parseToolArguments(toolCall.arguments);
      const dbToolCall = await this.prisma.toolCall.create({
        data: {
          userId,
          toolName: toolCall.name,
          input: JSON.stringify({ id: toolCall.id, arguments: input }),
        },
        select: { id: true },
      });

      await this.prisma.permissionDecision.create({
        data: {
          toolCallId: dbToolCall.id,
          decision: 'approved',
        },
      });

      const output = await this.executeSingleTool(userId, sessionId, toolCall.name, input);

      await this.prisma.toolCall.update({
        where: { id: dbToolCall.id },
        data: { output },
      });
      await this.conversationService.appendMessage(sessionId, userId, 'tool', output, {
        toolCallId: toolCall.id,
      });
    }
  }

  private async executeSingleTool(
    userId: string,
    sessionId: string,
    toolName: string,
    input: unknown,
  ): Promise<string> {
    try {
      const tool = this.toolRegistry.get(toolName);
      return await tool.execute(input, { userId, sessionId, prisma: this.prisma });
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }
}

function parseToolArguments(args: string): unknown {
  try {
    return args ? JSON.parse(args) : {};
  } catch {
    return {};
  }
}
