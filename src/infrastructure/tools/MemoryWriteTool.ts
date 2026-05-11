import { z } from 'zod';
import type { Tool } from '../../domain/agent/Tool.js';

const inputSchema = z.object({
  type: z.string().min(1),
  content: z.string().min(1),
});

export const MemoryWriteTool: Tool = {
  name: 'memory-write',
  description: '创建或更新当前用户的一条长期记忆。',
  inputSchema,
  async execute(input, ctx) {
    const args = inputSchema.parse(input);
    const existing = await ctx.prisma.memory.findFirst({
      where: {
        userId: ctx.userId,
        type: args.type,
        content: args.content,
      },
      select: { id: true },
    });

    const memory = existing
      ? await ctx.prisma.memory.update({
          where: { id: existing.id },
          data: { content: args.content },
          select: { id: true, type: true, content: true },
        })
      : await ctx.prisma.memory.create({
          data: {
            userId: ctx.userId,
            type: args.type,
            content: args.content,
          },
          select: { id: true, type: true, content: true },
        });

    return JSON.stringify({ ok: true, memory });
  },
};
