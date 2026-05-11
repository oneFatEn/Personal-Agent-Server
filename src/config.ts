import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DEEPSEEK_API_KEY: z.string().optional(),
  FIELD_ENCRYPTION_KEY: z.string().optional(),
  AGENT_MAX_ITERATIONS: z.coerce.number().int().positive().default(10),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid environment variables:');
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = result.data;
