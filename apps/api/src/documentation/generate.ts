import { readFile, writeFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';
import { generatedContractSchemas, generatedQueryParameters } from './contracts.js';
import { guidelinesPaths } from './guidelines-paths.js';

const path = new URL('../../../../openapi/gabinete-plus.yaml', import.meta.url);
const document = parseDocument(await readFile(path, 'utf8'));
if (document.errors.length) throw new Error('OpenAPI YAML inválido.');
for (const [path, value] of Object.entries(guidelinesPaths)) document.setIn(['paths', path], document.createNode(value));
for (const [name, schema] of Object.entries(generatedContractSchemas())) {
  document.setIn(['components', 'schemas', name], document.createNode(schema));
}
for (const [path, parameters] of Object.entries(generatedQueryParameters())) {
  const pathParameters = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1], in: 'path', required: true, schema: { type: 'string', minLength: 1, maxLength: 128 },
  }));
  document.setIn(['paths', path, 'get', 'parameters'], document.createNode([...pathParameters, ...parameters]));
}
await writeFile(path, document.toString({ lineWidth: 0, flowCollectionPadding: false }));
console.log('Schemas OpenAPI atualizados a partir de packages/shared.');
