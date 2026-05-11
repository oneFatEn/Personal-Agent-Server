import { toolRegistry, type ToolRegistry } from '../../domain/agent/ToolRegistry.js';
import { MemoryReadTool } from './MemoryReadTool.js';
import { MemoryWriteTool } from './MemoryWriteTool.js';
import { TaskCreateTool } from './TaskCreateTool.js';
import { TaskListTool } from './TaskListTool.js';

let registered = false;

export function registerBuiltInTools(registry: ToolRegistry = toolRegistry): ToolRegistry {
  if (registered) {
    return registry;
  }

  registry.register(MemoryReadTool);
  registry.register(MemoryWriteTool);
  registry.register(TaskCreateTool);
  registry.register(TaskListTool);
  registered = true;

  return registry;
}
