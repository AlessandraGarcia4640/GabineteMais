import { prisma } from '../../lib/prisma.js';
import { demoUsers } from './demo-users.js';

export async function seedDemoUsers(passwordHash: string): Promise<void> {
  await prisma.$transaction(demoUsers.map(({ position, ...user }) => prisma.user.upsert({
    where: { email: user.email },
    update: {},
    create: {
      ...user, passwordHash,
      positionHistory: { create: { position, role: user.role } },
    },
  })));
}
