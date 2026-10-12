import type { UserSummary } from '@gabinete-plus/shared';
import { prisma } from '../../lib/prisma.js';

export type CredentialUser = UserSummary & { passwordHash: string };

export async function findCredentialUser(email: string): Promise<CredentialUser | null> {
  const candidates = await prisma.user.findMany({
    where: { email: { equals: email, mode: 'insensitive' } }, take: 2,
    select: { id: true, name: true, email: true, role: true, isActive: true, passwordHash: true },
  });
  // Do not choose an arbitrary legacy account if case-only duplicate e-mails exist.
  return candidates.length === 1 ? candidates[0] ?? null : null;
}
