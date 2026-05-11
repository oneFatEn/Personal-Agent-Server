import OpenAI from 'openai';
import type {
  CompletionRequest,
  CompletionResponse,
  IModelProvider,
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
      messages: request.messages,
      stream: false,
    });

    return {
      content: response.choices[0]?.message.content ?? '',
      model: response.model,
      usage: mapUsage(response.usage),
    };
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages,
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
