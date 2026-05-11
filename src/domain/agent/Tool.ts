import type { PrismaClient } from '../../generated/prisma/client.js';
import type { z } from 'zod';

export interface ToolContext {
  userId: string;
  sessionId: string;
  prisma: PrismaClient;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  execute(input: unknown, ctx: ToolContext): Promise<string>;
}
