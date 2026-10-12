import { createGuidelineSchema, guidelineSchema, guidelinePageSchema, guidelineVersionSchema, guidelineVersionPageSchema, type CreateGuideline, type UpdateGuideline, type GuidelineListQuery, type GuidelineHistoryQuery } from '@gabinete-plus/shared';
import { AppError } from '../../lib/app-error.js';
import { unauthenticated, type AuthorizationService, type SessionPrincipal } from '../auth/authorization.service.js';
import type { GuidelineMutation, GuidelinesRepository, StoredGuideline } from './guidelines.repository.js';
export function guidelineView(row: StoredGuideline) { const author = row.versions[0]; if (!author) throw new Error('Versão de orientação ausente.'); return guidelineSchema.parse({ ...row, authorName: author.authorName, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }); }
const missing = () => new AppError('GUIDELINE_NOT_FOUND', 'Orientação não encontrada.', 404);
export class GuidelinesService {
  constructor(private readonly authorization: AuthorizationService, private readonly repository: GuidelinesRepository) {}
  private authorize(principal: SessionPrincipal, context: GuidelineMutation) {
    if (!context.actor || !context.session || context.actor.id !== principal.user.id || context.session.id !== principal.sessionId || context.session.user.id !== principal.user.id || context.session.revokedAt || context.session.expiresAt <= new Date()) throw unauthenticated();
    this.authorization.requirePermission({ ...principal, user: context.actor, expiresAt: context.session.expiresAt }, 'guidelines:manage');
  }
  async list(principal: SessionPrincipal, query: GuidelineListQuery) { this.authorization.requirePermission(principal, 'guidelines:read'); const rows = await this.repository.list(query); const items = rows.slice(0, query.limit); return guidelinePageSchema.parse({ items: items.map(guidelineView), nextCursor: rows.length > query.limit ? items.at(-1)?.id ?? null : null }); }
  async get(principal: SessionPrincipal, id: string) { this.authorization.requirePermission(principal, 'guidelines:read'); const row = await this.repository.find(id); if (!row) throw missing(); return guidelineView(row); }
  async history(principal: SessionPrincipal, id: string, query: GuidelineHistoryQuery) { await this.get(principal, id); const rows = await this.repository.history(id, query); const items = rows.slice(0, query.limit); return guidelineVersionPageSchema.parse({ items: items.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })), nextCursor: rows.length > query.limit ? String(items.at(-1)?.version) : null }); }
  async version(principal: SessionPrincipal, id: string, version: number) { await this.get(principal, id); const row = await this.repository.version(id, version); if (!row) throw missing(); return guidelineVersionSchema.parse({ ...row, createdAt: row.createdAt.toISOString() }); }
  create(principal: SessionPrincipal, input: CreateGuideline) { this.authorization.requirePermission(principal, 'guidelines:manage'); return this.repository.withActor(principal.user.id, principal.sessionId, null, async (context) => { this.authorize(principal, context); return guidelineView(await context.create(createGuidelineSchema.parse(input))); }); }
  update(principal: SessionPrincipal, id: string, input: UpdateGuideline) { this.authorization.requirePermission(principal, 'guidelines:manage'); return this.repository.withActor(principal.user.id, principal.sessionId, id, async (context) => {
    this.authorize(principal, context); const row = context.target; if (!row) throw missing(); if (row.isArchived) throw new AppError('GUIDELINE_ARCHIVED', 'Orientação arquivada não pode ser editada.', 409); if (row.version !== input.expectedVersion) throw new AppError('GUIDELINE_VERSION_CONFLICT', 'A orientação mudou. Reabra a versão atual antes de editar.', 409);
    const payload = createGuidelineSchema.parse({ title: input.title ?? row.title, category: input.category ?? row.category, content: input.content ?? row.content, essentialForTransition: input.essentialForTransition ?? row.essentialForTransition });
    if (payload.title === row.title && payload.category === row.category && payload.content === row.content && payload.essentialForTransition === row.essentialForTransition) return guidelineView(row);
    return guidelineView(await context.update(id, payload, row.version + 1));
  }); }
  archive(principal: SessionPrincipal, id: string) { this.authorization.requirePermission(principal, 'guidelines:manage'); return this.repository.withActor(principal.user.id, principal.sessionId, id, async (context) => { this.authorize(principal, context); if (!context.target) throw missing(); if (!context.target.isArchived) await context.archive(id); }); }
}
