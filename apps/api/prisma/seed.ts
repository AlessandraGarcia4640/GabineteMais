import { seedDemoTransition } from '../src/modules/transition/transition.repository.js';
import { z } from 'zod';
import { env } from '../src/lib/env.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/users/password.js';
import { demoDateSchema, seedDemoDataset } from '../src/modules/demo/demo.repository.js';
import { todayInGabinete } from '../src/modules/checklists/period.js';
import { seedDemoGuidelines } from '../src/modules/guidelines/guidelines.repository.js';

try {
  if (env.NODE_ENV === 'production') throw new Error('Seed de demonstração não permitido em produção.');
  const password = z.string().min(12).max(128).parse(process.env.DEMO_SEED_PASSWORD);
  const day = demoDateSchema.parse(process.env.DEMO_REFERENCE_DATE ?? todayInGabinete());
  await seedDemoDataset(await hashPassword(password), day);
  await seedDemoGuidelines();
  await seedDemoTransition();
  console.log(`Demonstração fictícia preparada para ${day}. Contas, snapshots e alterações existentes foram preservados.`);
} finally {
  await prisma.$disconnect();
}
