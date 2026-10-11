import { z } from 'zod';
import { env } from '../src/lib/env.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/users/password.js';
import { seedDemoUsers } from '../src/modules/users/users.repository.js';

try {
  if (env.NODE_ENV === 'production') throw new Error('Seed de demonstração não permitido em produção.');
  const password = z.string().min(12).max(128).parse(process.env.DEMO_SEED_PASSWORD);
  await seedDemoUsers(await hashPassword(password));
  console.log('Usuários fictícios preparados. Contas existentes foram preservadas.');
} finally {
  await prisma.$disconnect();
}
