import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoutineSchema, loginResponseSchema, routineSchema, taskSchema, type Task, type Routine } from '@gabinete-plus/shared';
import type { ReactElement } from 'react';
import { SessionContext } from '../../providers/session-provider';
import { SessionManager } from '../auth/session-manager';
export function taskFixture(input: Partial<Task> = {}): Task {
  return taskSchema.parse({ id: 'task-1', title: 'Tarefa fictícia', description: '', instructions: '', priority: 'NORMAL', status: 'ABERTA',
    dueDate: null, assigneeId: 'actor', routineId: null, checklistRunId: null, contactId: null, createdById: 'actor', updatedById: 'actor', isOverdue: false,
    startedAt: input.status === 'EM_ANDAMENTO' || input.status === 'CONCLUIDA' ? '2026-10-11T12:00:00Z' : null,
    completedAt: null, completedById: null, cancelledAt: null, cancelledById: null, createdAt: '2026-10-11T12:00:00Z', updatedAt: '2026-10-11T12:00:00Z', ...input });
}
export function routineFixture(input: Partial<Routine> = {}): Routine {
  return routineSchema.parse({ ...createRoutineSchema.parse({ title: 'Rotina fictícia', category: 'Administrativo', frequency: 'DIARIA' }),
    id: 'routine-1', isArchived: false, createdById: 'actor', updatedById: 'actor', createdAt: '2026-10-11T12:00:00Z', updatedAt: '2026-10-11T12:00:00Z', ...input });
}
export async function dashboardFixture() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  const result = loginResponseSchema.parse({ accessToken: 'access-ficticio', refreshToken: 'A'.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z', expiresIn: 900, tokenType: 'Bearer',
    user: { id: 'actor', name: 'Pessoa Fictícia', email: 'pessoa@example.invalid', role: 'ASSESSOR', isActive: true } });
  const manager = new SessionManager({ api: { baseUrl: 'https://api.example.invalid', login: () => Promise.resolve(result), refresh: () => Promise.resolve(result),
    current: () => Promise.resolve({ user: result.user, permissions: [] }), logout: () => Promise.resolve() },
    storage: { read: () => Promise.resolve(null), save: () => Promise.resolve(), clear: () => Promise.resolve() }, clearCache: () => client.clear() });
  await manager.login({ email: 'pessoa@example.invalid', password: 'Senha-ficticia-35' });
  return { client, manager, show(element: ReactElement) { return render(<QueryClientProvider client={client}><SessionContext.Provider value={manager}>{element}</SessionContext.Provider></QueryClientProvider>); } };
}
