import OpenAI from 'openai';
import type {
  CompletionRequest,
  CompletionResponse,
  IModelProvider,
  Message,
  StreamChunk,
  TokenUsage,
} from '../../domain/providers/IModelProvider.js';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

function mapUsage(usage: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
} | null | undefined): TokenUsage {
  return {
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
    promptCacheHitTokens: usage?.prompt_cache_hit_tokens,
    promptCacheMissTokens: usage?.prompt_cache_miss_tokens,
  };
}

function mapMessages(messages: Message[]) {
  return messages.map((message) => {
    if (message.role === 'tool') {
      return {
        role: 'tool' as const,
        content: message.content,
        tool_call_id: message.toolCallId ?? '',
      };
    }

    if (message.role === 'assistant' && message.toolCalls?.length) {
      return {
        role: 'assistant' as const,
        content: message.content || null,
        tool_calls: message.toolCalls.map((toolCall) => ({
          id: toolCall.id,
          type: 'function' as const,
          function: {
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
        })),
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

export class DeepSeekProvider implements IModelProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string | undefined) {
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required to use DeepSeekProvider');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: mapMessages(request.messages),
      tools: request.tools,
      stream: false,
    });
    const message = response.choices[0]?.message;

    return {
      content: message?.content ?? '',
      model: response.model,
      usage: mapUsage(response.usage),
      toolCalls: message?.tool_calls?.map((toolCall) => ({
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      })),
    };
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: mapMessages(request.messages),
      tools: request.tools,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta.content ?? '';
      const usage = mapUsage(chunk.usage);

      if (delta || usage.totalTokens > 0) {
        yield {
          delta,
          model: chunk.model,
          usage: usage.totalTokens > 0 ? usage : undefined,
        };
      }
    }
  }
}
