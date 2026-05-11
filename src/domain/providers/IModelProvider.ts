export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface Message {
  role: MessageRole;
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
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
  tools?: ToolDefinition[];
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: TokenUsage;
  toolCalls?: ToolCall[];
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

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
