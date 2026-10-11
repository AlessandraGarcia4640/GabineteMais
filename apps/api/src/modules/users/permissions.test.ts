import { describe, expect, it } from 'vitest';
import type { UserRole, UserSummary } from '@gabinete-plus/shared';
import { canExecuteAssignedTask, hasPermission, permissionsFor } from './permissions.js';

function user(role: UserRole, isActive = true): UserSummary {
  return { id: 'alice', name: 'Alice', email: 'alice@example.invalid', role, isActive };
}

describe('permissões do MVP', () => {
  it('reserva gestão e distribuição à chefia', () => {
    expect(hasPermission(user('CHEFE'), 'team:manage')).toBe(true);
    expect(hasPermission(user('CHEFE'), 'substitutions:manage')).toBe(true);
    for (const role of ['ASSESSOR', 'APOIO']) {
      const actor = user(role === 'ASSESSOR' ? 'ASSESSOR' : 'APOIO');
      expect(hasPermission(actor, 'team:read')).toBe(true);
      expect(hasPermission(actor, 'team:manage')).toBe(false);
      expect(hasPermission(actor, 'tasks:assign')).toBe(false);
    }
  });

  it('nega toda permissão a usuários inativos, inclusive chefia', () => {
    expect(permissionsFor(user('CHEFE', false))).toEqual([]);
    expect(canExecuteAssignedTask(user('ASSESSOR', false), 'alice')).toBe(false);
  });

  it('não permite executar tarefas alheias pelo simples perfil', () => {
    expect(canExecuteAssignedTask(user('ASSESSOR'), 'alice')).toBe(true);
    expect(canExecuteAssignedTask(user('ASSESSOR'), 'bob')).toBe(false);
    expect(canExecuteAssignedTask(user('CHEFE'), 'bob')).toBe(false);
  });
});
