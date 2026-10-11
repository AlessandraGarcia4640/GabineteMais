import { z } from 'zod';
import './load-env.js';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.url().refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), 'Use uma URL PostgreSQL.'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres.'),
});

export const env = envSchema.parse(process.env);
