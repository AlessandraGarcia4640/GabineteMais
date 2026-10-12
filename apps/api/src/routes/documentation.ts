import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { Router } from 'express';
import { absolutePath } from 'swagger-ui-dist';
import { parse } from 'yaml';
import { z } from 'zod';
import { emptyQuerySchema } from '@gabinete-plus/shared';

const root = new URL('../../../../openapi/', import.meta.url);
const source = readFileSync(new URL('gabinete-plus.yaml', root), 'utf8');
const document = z.record(z.string(), z.json()).parse(parse(source));
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gabinete+ — Documentação da API</title><link rel="stylesheet" href="/docs/assets/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="/docs/assets/swagger-ui-bundle.js"></script><script src="/docs/initializer.js"></script></body></html>`;
const initializer = `window.onload = () => {
  SwaggerUIBundle({ url: '/docs/openapi.json', dom_id: '#swagger-ui', deepLinking: true,
    persistAuthorization: false, validatorUrl: null, defaultModelsExpandDepth: 0,
    supportedSubmitMethods: ['get', 'post', 'patch', 'delete'] });
};`;

export function createDocumentationRouter(): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    // Swagger UI adds dynamic styles. Scripts and network requests stay on this origin.
    response.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    next();
  });
  router.get('/', (request, response) => { emptyQuerySchema.parse(request.query); response.type('html').send(html); });
  router.get('/initializer.js', (request, response) => { emptyQuerySchema.parse(request.query); response.type('js').send(initializer); });
  router.get('/openapi.json', (request, response) => { emptyQuerySchema.parse(request.query); response.json(document); });
  router.get('/openapi.yaml', (request, response) => { emptyQuerySchema.parse(request.query); response.type('application/yaml').send(source); });
  router.use('/assets', express.static(absolutePath(), { index: false, dotfiles: 'deny' }));
  router.use('/examples', express.static(fileURLToPath(new URL('examples/', root)), { index: false, dotfiles: 'deny' }));
  return router;
}
