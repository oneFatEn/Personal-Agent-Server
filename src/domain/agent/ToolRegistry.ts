import { toJSONSchema } from 'zod';
import type { Tool } from './Tool.js';
import type { ToolDefinition } from '../providers/IModelProvider.js';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not registered: ${name}`);
    }

    return tool;
  }

  list(): Tool[] {
    return [...this.tools.values()];
  }

  toOpenAITools(): ToolDefinition[] {
    return this.list().map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: toJSONSchema(tool.inputSchema) as Record<string, unknown>,
      },
    }));
  }
}

export const toolRegistry = new ToolRegistry();
