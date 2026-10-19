import type { UserPosition, UserRole } from '@gabinete-plus/shared';

export const demoUsers: readonly { name: string; email: string; role: UserRole; position: UserPosition }[] = [
  { name: 'Helena Demonstração', email: 'magistrado@example.invalid', role: 'CHEFE', position: 'MAGISTRADO_GESTOR' },
  { name: 'Alessandra', email: 'chefia@example.invalid', role: 'CHEFE', position: 'ASSESSOR_CHEFE' },
  { name: 'João Demonstração', email: 'assessor1@example.invalid', role: 'ASSESSOR', position: 'ASSESSOR' },
  { name: 'Ana Demonstração', email: 'assessor2@example.invalid', role: 'ASSESSOR', position: 'ASSESSOR' },
  { name: 'Pedro Demonstração', email: 'apoio@example.invalid', role: 'APOIO', position: 'APOIO' },
];
