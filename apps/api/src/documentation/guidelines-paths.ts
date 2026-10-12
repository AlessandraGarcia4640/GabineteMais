import { z } from 'zod';
import { createGuidelineSchema, updateGuidelineSchema, guidelineSchema, guidelineVersionSchema } from '@gabinete-plus/shared';
type Json = z.infer<ReturnType<typeof z.json>>;
const input = createGuidelineSchema.parse({ title: 'Orientação fictícia', category: 'SESSOES', content: '# Sessão\n\nConferir materiais fictícios.', essentialForTransition: true });
const current = guidelineSchema.parse({ ...input, id: 'demo-guideline', isArchived: false, version: 1, createdById: 'demo-chief', updatedById: 'demo-chief', authorName: 'Chefia fictícia', createdAt: '2026-10-12T12:00:00Z', updatedAt: '2026-10-12T12:00:00Z' });
const version = guidelineVersionSchema.parse({ ...input, id: 'demo-version', guidelineId: current.id, version: 1, authorId: 'demo-chief', authorName: current.authorName, createdAt: current.createdAt });
function media(schema: string, value: Json) { return { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` }, examples: { ficticio: { value } } } }; }
function operation(operationId: string, summary: string, schema?: string, example?: Json, body?: { schema: string; value: Json }, extra = false) {
  const responses: Record<string, Json> = { '401': { $ref: '#/components/responses/Unauthenticated' }, '403': { $ref: '#/components/responses/Forbidden' }, '400': { $ref: '#/components/responses/InvalidInput' } };
  responses[body && operationId === 'createGuideline' ? '201' : schema ? '200' : '204'] = schema ? { description: summary, content: media(schema, example ?? null) } : { description: summary };
  if (body) { responses['413'] = { $ref: '#/components/responses/BodyTooLarge' }; responses['409'] = { description: 'Orientação arquivada ou conflito de versão', content: media('ApiError', { error: { code: 'GUIDELINE_VERSION_CONFLICT', message: 'A orientação mudou. Reabra a versão atual antes de editar.' } }) }; }
  if (extra) responses['404'] = { description: 'Orientação não encontrada', content: media('ApiError', { error: { code: 'GUIDELINE_NOT_FOUND', message: 'Orientação não encontrada.' } }) };
  return { operationId, summary, tags: ['Guidelines'], security: [{ bearerAuth: [] }], responses, ...(body ? { requestBody: { required: true, content: media(body.schema, body.value) } } : {}) };
}
const id = { name: 'id', in: 'path', required: true, schema: { type: 'string', minLength: 1, maxLength: 128 } };
export const guidelinesPaths: Record<string, Json> = {
  '/guidelines': { get: operation('listGuidelines', 'Consulta orientações paginadas', 'GuidelinePage', { items: [current], nextCursor: null }), post: operation('createGuideline', 'Cria orientação e primeira versão', 'Guideline', current, { schema: 'CreateGuideline', value: input }) },
  '/guidelines/{id}': { get: { ...operation('getGuideline', 'Consulta orientação atual', 'Guideline', current, undefined, true), parameters: [id] }, patch: { ...operation('updateGuideline', 'Edita com controle de versão e preserva histórico', 'Guideline', current, { schema: 'UpdateGuideline', value: z.json().parse(updateGuidelineSchema.parse({ expectedVersion: 1, title: 'Título atualizado' })) }, true), parameters: [id] }, delete: { ...operation('archiveGuideline', 'Arquiva sem apagar versões', undefined, undefined, undefined, true), parameters: [id] } },
  '/guidelines/{id}/versions': { get: { ...operation('listGuidelineVersions', 'Consulta versões imutáveis paginadas', 'GuidelineVersionPage', { items: [version], nextCursor: null }, undefined, true), parameters: [id] } },
  '/guidelines/{id}/versions/{version}': { get: { ...operation('getGuidelineVersion', 'Consulta versão preservada', 'GuidelineVersion', version, undefined, true), parameters: [id, { name: 'version', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 2147483647 } }] } },
};
