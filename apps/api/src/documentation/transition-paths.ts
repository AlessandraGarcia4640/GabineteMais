import type { z } from 'zod';
import { transitionGuideSchema, transitionSnapshotSchema, createTransitionSnapshotSchema, updateTransitionSchema } from '@gabinete-plus/shared';
type Json = z.infer<ReturnType<typeof z.json>>;
const settings = { overview: 'Visão geral fictícia', notes: 'Notas fictícias', revision: 1 };
const guide = transitionGuideSchema.parse({ settings, generatedAt: '2026-10-12T12:00:00Z', section: { kind: 'ROUTINES', items: [], nextCursor: null } });
const snapshot = transitionSnapshotSchema.parse({ id: 'demo-transition', title: 'Estado fictício do gabinete', version: 1, authorId: 'demo-chief', authorName: 'Chefia fictícia', createdAt: guide.generatedAt, content: { overview: settings.overview, notes: settings.notes, routines: [], guidelines: [], contacts: [], tasks: [] } });
function media(schema: string, value: Json) { return { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` }, examples: { ficticio: { value } } } }; }
function operation(operationId: string, summary: string, schema: string, example: Json, body?: { schema: string; value: Json }) {
  const responses: Record<string, Json> = { [operationId === 'createTransitionSnapshot' ? '201' : '200']: { description: summary, content: media(schema, example) }, '401': { $ref: '#/components/responses/Unauthenticated' }, '403': { $ref: '#/components/responses/Forbidden' }, '400': { $ref: '#/components/responses/InvalidInput' }, '404': { description: 'Cópia não encontrada', content: media('ApiError', { error: { code: 'TRANSITION_NOT_FOUND', message: 'Cópia de transição não encontrada.' } }) } };
  if (body) { responses['413'] = { $ref: '#/components/responses/BodyTooLarge' }; responses['409'] = { description: 'Revisão desatualizada, concorrência ou seção com mais de 100 itens', content: media('ApiError', { error: { code: 'TRANSITION_CONFLICT', message: 'O guia mudou. Reabra as informações.' } }) }; }
  return { operationId, summary, tags: ['Transition'], security: [{ bearerAuth: [] }], responses, ...(body ? { requestBody: { required: true, content: media(body.schema, body.value) } } : {}) };
}
const { content: omitted, ...summary } = snapshot; void omitted;
export const transitionPaths: Record<string, Json> = {
  '/transition-guide': { get: operation('getTransitionGuide', 'Consulta seção paginada do guia vivo', 'TransitionGuide', guide), patch: operation('updateTransition', 'Edita visão geral e anotações pela chefia', 'TransitionSettings', settings, { schema: 'UpdateTransition', value: updateTransitionSchema.parse({ overview: settings.overview, notes: settings.notes, expectedRevision: 0 }) }) },
  '/transition-guide/snapshots': { get: operation('listTransitionSnapshots', 'Consulta cópias preservadas paginadas', 'TransitionSnapshotPage', { items: [summary], nextCursor: null }), post: operation('createTransitionSnapshot', 'Gera cópia imutável das seis seções', 'TransitionSnapshot', snapshot, { schema: 'CreateTransitionSnapshot', value: createTransitionSnapshotSchema.parse({ title: snapshot.title, expectedRevision: 1 }) }) },
  '/transition-guide/snapshots/{id}': { get: { ...operation('getTransitionSnapshot', 'Reabre estado preservado do gabinete', 'TransitionSnapshot', snapshot), parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', minLength: 1, maxLength: 128 } }] } },
};
