import { afterAll, describe, expect, it } from 'vitest';
import { demoUsers } from './demo-users.js';
import { hashPassword, verifyPassword } from './password.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('seed em PostgreSQL descartável', () => {
  it('preserva senha, ativação e histórico ao executar novamente', async () => {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) throw new Error('TEST_DATABASE_URL é obrigatória.');
    process.env.DATABASE_URL = testUrl;
    const { prisma } = await import('../../lib/prisma.js');
    const { seedDemoUsers } = await import('./users.repository.js');
    const emails = demoUsers.map((user) => user.email);
    const unexpected = await prisma.user.count({ where: { email: { notIn: emails } } });
    if (unexpected !== 0) throw new Error('Banco não é exclusivo da demonstração.');
    await prisma.$transaction([
      prisma.userPositionHistory.deleteMany({ where: { user: { email: { in: emails } } } }),
      prisma.user.deleteMany({ where: { email: { in: emails } } }),
    ]);

    const firstHash = await hashPassword('senha-primeira-ficticia');
    await seedDemoUsers(firstHash);
    const before = await prisma.user.findMany({ include: { positionHistory: true }, orderBy: { email: 'asc' } });
    expect(before).toHaveLength(5);
    expect(before.every((user) => user.positionHistory.length === 1)).toBe(true);
    const first = before[0];
    if (!first) throw new Error('Seed não criou usuários.');
    await expect(prisma.userPositionHistory.create({ data: {
      userId: first.id, role: first.role, position: 'ASSESSOR_CHEFE',
    } })).rejects.toThrow();
    await expect(prisma.userPositionHistory.create({ data: {
      userId: first.id, role: first.role, position: 'ASSESSOR_CHEFE',
      startedAt: new Date('2026-10-11T12:00:00Z'), endedAt: new Date('2026-10-10T12:00:00Z'),
    } })).rejects.toThrow();
    await expect(prisma.user.delete({ where: { id: first.id } })).rejects.toThrow();
    await prisma.user.update({ where: { email: 'apoio@example.invalid' }, data: { isActive: false } });
    await seedDemoUsers(await hashPassword('senha-segunda-ficticia'));
    const after = await prisma.user.findMany({ include: { positionHistory: true }, orderBy: { email: 'asc' } });
    expect(after.map((user) => user.positionHistory)).toEqual(before.map((user) => user.positionHistory));
    expect(after.map((user) => user.passwordHash)).toEqual(before.map((user) => user.passwordHash));
    expect(after.find((user) => user.email === 'apoio@example.invalid')?.isActive).toBe(false);
    for (const user of after) expect(await verifyPassword(user.passwordHash, 'senha-primeira-ficticia')).toBe(true);
  });

  afterAll(async () => {
    const { prisma } = await import('../../lib/prisma.js');
    await prisma.$disconnect();
  });
});
