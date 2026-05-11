import { z } from 'zod';
import type { Tool } from '../../domain/agent/Tool.js';

const inputSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done', 'cancelled']).optional(),
});

export const TaskListTool: Tool = {
  name: 'task-list',
  description: '查询当前用户的任务列表，可按 status 过滤。',
  inputSchema,
  async execute(input, ctx) {
    const args = inputSchema.parse(input);
    const tasks = await ctx.prisma.task.findMany({
      where: {
        userId: ctx.userId,
        ...(args.status ? { status: args.status } : {}),
      },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      select: { id: true, title: true, description: true, status: true, dueAt: true, createdAt: true },
    });

    return JSON.stringify(tasks);
  },
};
