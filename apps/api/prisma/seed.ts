import { seedDemoTasks } from '../src/modules/tasks/tasks.repository.js';
import { z } from 'zod';
import { env } from '../src/lib/env.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/users/password.js';
import { seedDemoUsers } from '../src/modules/users/users.repository.js';
import { seedDemoRoutines } from '../src/modules/routines/routines.repository.js';
import { seedDemoChecklists } from '../src/modules/checklists/checklists.repository.js';
import { seedDemoContacts } from '../src/modules/contacts/contacts.repository.js';

try {
  if (env.NODE_ENV === 'production') throw new Error('Seed de demonstração não permitido em produção.');
  const password = z.string().min(12).max(128).parse(process.env.DEMO_SEED_PASSWORD);
  await seedDemoUsers(await hashPassword(password));
  await seedDemoRoutines();
  await seedDemoChecklists();
  await seedDemoContacts();
  await seedDemoTasks();
  console.log('Usuários fictícios preparados. Contas existentes foram preservadas.');
} finally {
  await prisma.$disconnect();
}
