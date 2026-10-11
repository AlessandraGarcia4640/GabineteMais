import { prisma } from '../../lib/prisma.js';
import { demoUsers } from './demo-users.js';
import type { UserSummary } from '@gabinete-plus/shared';

export function findPublicUserById(id: string): Promise<UserSummary | null> {
  return prisma.user.findUnique({ where: { id }, select: {
    id: true, name: true, email: true, role: true, isActive: true,
  } });
}

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
