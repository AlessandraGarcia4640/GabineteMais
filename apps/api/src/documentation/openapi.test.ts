import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';
import { parse } from 'yaml';
import { z } from 'zod';
import { expect, it } from 'vitest';
import { contractSchemas, generatedContractSchemas, generatedQueryParameters } from './contracts.js';

const root = new URL('../../../../', import.meta.url);
const file = new URL('openapi/gabinete-plus.yaml', root);
const reference = z.object({ $ref: z.string() });
const example = z.object({ value: z.json().optional(), externalValue: z.string().optional() });
const media = z.object({ schema: reference, examples: z.record(z.string(), example).optional() });
const content = z.object({ 'application/json': media });
const response = z.object({ $ref: z.string().optional(), description: z.string().optional(), content: content.optional() });
const operation = z.object({ operationId: z.string(), summary: z.string(), security: z.array(z.record(z.string(), z.array(z.string()))),
  requestBody: z.object({ required: z.boolean(), content }).optional(), responses: z.record(z.string(), response),
  parameters: z.array(z.object({ name: z.string(), in: z.string(), required: z.boolean().optional(), schema: z.record(z.string(), z.json()) })).optional() });
const documentSchema = z.object({ openapi: z.literal('3.1.0'), info: z.object({ description: z.string() }),
  paths: z.record(z.string(), z.record(z.string(), operation)), components: z.object({ schemas: z.record(z.string(), z.json()), responses: z.record(z.string(), response) }) });
async function document() { return documentSchema.parse(parse(await readFile(file, 'utf8'))); }

it('valida OpenAPI 3.1 e todas as referências sem acessar serviços externos', async () => {
  await SwaggerParser.validate(fileURLToPath(file), { resolve: { http: false } });
});
it('schemas documentados acompanham a fonte shared sem divergência', async () => {
  expect((await document()).components.schemas).toEqual(generatedContractSchemas());
});
it('filtros e limites de paginação acompanham os schemas de entrada', async () => {
  const spec = await document();
  for (const [path, parameters] of Object.entries(generatedQueryParameters())) {
    expect(spec.paths[path]?.get?.parameters?.filter((parameter) => parameter.in === 'query')).toEqual(parameters);
  }
});
it('cada rota de negócio montada pela API está documentada, sem endpoints planejados', async () => {
  const source = await readFile(new URL('apps/api/src/app.ts', root), 'utf8');
  const imports = new Map([...source.matchAll(/import \{ (\w+) \} from '([^']+\.js)'/g)].map((match) => [match[1], match[2]]));
  const implemented: string[] = [];
  for (const match of source.matchAll(/app\.use\('([^']+)',\s*(\w+)/g)) {
    const prefix = match[1]; const name = match[2]; if (!prefix || prefix === '/docs') continue;
    const relative = imports.get(name); if (!relative) throw new Error(`Router sem import: ${String(name)}`);
    const router = await readFile(new URL(relative.replace(/\.js$/, '.ts'), new URL('apps/api/src/app.ts', root)), 'utf8');
    for (const route of router.matchAll(/\w+\.(get|post|patch|delete)\(\s*'([^']+)'/g)) {
      const method = route[1]; const path = route[2]; if (!path || !method) throw new Error('Rota inválida.');
      implemented.push(`${method.toUpperCase()} ${(prefix + (path === '/' ? '' : path)).replace(/:([A-Za-z]+)/g, '{$1}')}`);
    }
  }
  const spec = await document();
  const documented = Object.entries(spec.paths).flatMap(([path, methods]) => Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`));
  expect(implemented.length).toBeGreaterThan(40); expect(documented.sort()).toEqual(implemented.sort());
});
it('declara autenticação, parâmetros de caminho e respostas sem corpo corretamente', async () => {
  const spec = await document(); const ids: string[] = [];
  const publicPaths = ['/health', '/auth/login', '/auth/refresh', '/auth/logout'];
  for (const [path, methods] of Object.entries(spec.paths)) for (const op of Object.values(methods)) {
    ids.push(op.operationId); expect(op.security).toEqual(publicPaths.includes(path) ? [] : [{ bearerAuth: [] }]);
    for (const parameter of path.matchAll(/\{([^}]+)\}/g)) expect(op.parameters).toContainEqual(expect.objectContaining({ name: parameter[1], in: 'path', required: true }));
    if (op.responses['204']) expect(op.responses['204'].content).toBeUndefined();
    if (op.requestBody) expect(op.responses).toHaveProperty('413');
  }
  expect(new Set(ids).size).toBe(ids.length);
  expect(spec.info.description).toContain('RF05'); expect(spec.info.description).toContain('RF06');
});
it('todos os exemplos de entradas, saídas e erros passam nos schemas shared', async () => {
  const spec = await document(); const schemas = new Map<string, z.ZodType>(Object.entries(contractSchemas));
  async function validateMedia(value: z.infer<typeof media>): Promise<void> {
    const name = value.schema.$ref.split('/').at(-1); const schema = name ? schemas.get(name) : null;
    if (!schema) throw new Error(`Schema sem contrato: ${String(name)}`);
    if (!value.examples || Object.keys(value.examples).length === 0) throw new Error(`Exemplo ausente: ${String(name)}`);
    for (const entry of Object.values(value.examples)) {
      const payload = entry.externalValue ? z.json().parse(JSON.parse(await readFile(new URL(entry.externalValue, file), 'utf8'))) : entry.value;
      expect(schema.safeParse(payload).success, `Exemplo ${String(name)}`).toBe(true);
    }
  }
  for (const methods of Object.values(spec.paths)) for (const op of Object.values(methods)) {
    if (op.requestBody) await validateMedia(op.requestBody.content['application/json']);
    for (const [code, reply] of Object.entries(op.responses)) {
      if (reply.content && code.startsWith('2')) await validateMedia(reply.content['application/json']);
    }
  }
  for (const reply of Object.values(spec.components.responses)) if (reply.content) await validateMedia(reply.content['application/json']);
});
