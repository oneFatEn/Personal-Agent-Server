import { z } from 'zod';
import type { Tool } from '../../domain/agent/Tool.js';

const inputSchema = z.object({
  type: z.string().min(1).optional(),
});

export const MemoryReadTool: Tool = {
  name: 'memory-read',
  description: '读取当前用户的长期记忆，可按 type 过滤。',
  inputSchema,
  async execute(input, ctx) {
    const args = inputSchema.parse(input);
    const memories = await ctx.prisma.memory.findMany({
      where: {
        userId: ctx.userId,
        ...(args.type ? { type: args.type } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, type: true, content: true, createdAt: true, updatedAt: true },
    });

    return JSON.stringify(memories);
  },
};
