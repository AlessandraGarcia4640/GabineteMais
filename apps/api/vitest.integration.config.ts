import { defineConfig } from 'vitest/config';
import { z } from 'zod';

if (process.env.NODE_ENV === 'production') throw new Error('Testes de integração não são permitidos em produção.');
const configured = z.url().refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://')).safeParse(process.env.TEST_DATABASE_URL);
if (!configured.success) throw new Error('Configure TEST_DATABASE_URL com uma conexão PostgreSQL de teste antes de executar test:integration.');

export default defineConfig({ test: {
  include: ['src/**/*.integration.test.ts'], testTimeout: 30000, hookTimeout: 30000,
} });
