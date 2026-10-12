import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z
    .string()
    .default('postgresql://gabinete:gabinete_local@localhost:5432/gabinete_plus?schema=public'),
  JWT_ACCESS_SECRET: z.string().min(32).default('gabinete-plus-dev-access-secret-2026'),
  JWT_REFRESH_SECRET: z.string().min(32).default('gabinete-plus-dev-refresh-secret-2026'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
});

export const env = envSchema.parse(process.env);
