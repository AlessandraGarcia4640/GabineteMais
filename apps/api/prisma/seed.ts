import 'dotenv/config';
import { hashPassword } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';

const password = 'Gabinete+2026!';
const passwordHash = await hashPassword(password);

const users = [
  {
    name: 'Chefia Demo',
    email: 'chefe@gabinete.local',
    role: 'CHEFE' as const,
    isActive: true,
  },
  {
    name: 'Assessor Demo',
    email: 'assessor@gabinete.local',
    role: 'ASSESSOR' as const,
    isActive: true,
  },
  {
    name: 'Apoio Demo',
    email: 'apoio@gabinete.local',
    role: 'APOIO' as const,
    isActive: true,
  },
  {
    name: 'Usuário Inativo',
    email: 'inativo@gabinete.local',
    role: 'ASSESSOR' as const,
    isActive: false,
  },
];

for (const user of users) {
  await prisma.user.upsert({
    where: { email: user.email },
    update: {
      name: user.name,
      passwordHash,
      role: user.role,
      isActive: user.isActive,
    },
    create: {
      ...user,
      passwordHash,
    },
  });
}

console.log('Seed RF00 concluído.');
console.log('Usuários fictícios: chefe, assessor, apoio e inativo.');
console.log('Senha comum para demonstração: Gabinete+2026!');

await prisma.$disconnect();
