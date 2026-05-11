import { z } from 'zod';
import type { Tool } from '../../domain/agent/Tool.js';

const inputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  dueAt: z.string().min(1).optional(),
});

export const TaskCreateTool: Tool = {
  name: 'task-create',
  description: '为当前用户创建一条待办任务。',
  inputSchema,
  async execute(input, ctx) {
    const args = inputSchema.parse(input);
    const task = await ctx.prisma.task.create({
      data: {
        userId: ctx.userId,
        title: args.title,
        description: args.description,
        dueAt: args.dueAt ? new Date(args.dueAt) : undefined,
      },
      select: { id: true, title: true, status: true, dueAt: true },
    });

    return JSON.stringify(task);
  },
};
