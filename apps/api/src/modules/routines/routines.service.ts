import { createRoutineSchema, routinePageSchema, routineSchema, type CreateRoutine, type Routine, type RoutineListQuery, type RoutinePage, type UpdateRoutine } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import { unauthenticated, type AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import type { RoutineMutation, RoutinesRepository, StoredRoutine } from './routines.repository.js';

function payload(row: StoredRoutine): CreateRoutine {
  return { title: row.title, category: row.category, frequency: row.frequency, description: row.description,
    instructions: row.instructions, steps: row.steps, frequencyDetails: row.frequencyDetails,
    specificDate: row.specificDate?.toISOString().slice(0, 10) ?? null, defaultPosition: row.defaultPosition,
    essentialForTransition: row.essentialForTransition };
}
function view(row: StoredRoutine): Routine {
  return routineSchema.parse({ ...row, ...payload(row), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
}
function missing(): AppError { return new AppError('ROUTINE_NOT_FOUND', 'Atividade não encontrada.', 404); }

export class RoutinesService {
  constructor(private readonly authorization: AuthorizationService, private readonly repository: RoutinesRepository) {}
  private authorize(principal: SessionPrincipal, context: RoutineMutation): void {
    if (!context.actor || !context.session) throw unauthenticated();
    if (context.actor.id !== principal.user.id || context.session.id !== principal.sessionId || context.session.user.id !== principal.user.id
      || context.session.revokedAt || context.session.expiresAt <= new Date()) throw unauthenticated();
    this.authorization.requirePermission({ ...principal, user: context.actor, expiresAt: context.session.expiresAt }, 'activities:manage');
  }
  async list(principal: SessionPrincipal, query: RoutineListQuery): Promise<RoutinePage> {
    this.authorization.requirePermission(principal, 'activities:read');
    const rows = await this.repository.list(query);
    const visible = rows.slice(0, query.limit);
    return routinePageSchema.parse({ items: visible.map(view), nextCursor: rows.length > query.limit ? visible.at(-1)?.id ?? null : null });
  }
  async get(principal: SessionPrincipal, id: string): Promise<Routine> {
    this.authorization.requirePermission(principal, 'activities:read');
    const row = await this.repository.find(id);
    if (!row) throw missing();
    return view(row);
  }
  async create(principal: SessionPrincipal, input: CreateRoutine): Promise<Routine> {
    this.authorization.requirePermission(principal, 'activities:manage');
    return this.repository.withActor(principal.user.id, principal.sessionId, null, async (context) => {
      this.authorize(principal, context);
      return view(await context.create(createRoutineSchema.parse(input)));
    });
  }
  async update(principal: SessionPrincipal, id: string, input: UpdateRoutine): Promise<Routine> {
    this.authorization.requirePermission(principal, 'activities:manage');
    return this.repository.withActor(principal.user.id, principal.sessionId, id, async (context) => {
      this.authorize(principal, context);
      if (!context.target) throw missing();
      if (context.target.isArchived) throw new AppError('ROUTINE_ARCHIVED', 'Atividade arquivada não pode ser editada.', 409);
      const merged = createRoutineSchema.parse({ ...payload(context.target), ...input });
      return view(await context.update(id, merged));
    });
  }
  async archive(principal: SessionPrincipal, id: string): Promise<void> {
    this.authorization.requirePermission(principal, 'activities:manage');
    await this.repository.withActor(principal.user.id, principal.sessionId, id, async (context) => {
      this.authorize(principal, context);
      if (!context.target) throw missing();
      if (!context.target.isArchived) await context.archive(id);
    });
  }
}
