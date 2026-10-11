import type { UserSummary } from '@gabinete-plus/shared';
import { prisma } from '../../lib/prisma.js';

export type CredentialUser = UserSummary & { passwordHash: string };

export function findCredentialUser(email: string): Promise<CredentialUser | null> {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, isActive: true, passwordHash: true },
  });
}
