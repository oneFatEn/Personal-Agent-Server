export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: TokenUsage;
}

export interface StreamChunk {
  delta: string;
  model?: string;
  usage?: TokenUsage;
}

export interface IModelProvider {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;
}
