import request from 'supertest';
import { expect, it } from 'vitest';
import { createApp } from '../app.js';
import { env } from '../lib/env.js';

it('serve interface, contrato JSON/YAML, exemplos e assets localmente', async () => {
  const app = createApp();
  const page = await request(app).get('/docs/').expect(200);
  expect(page.text).toContain('lang="pt-BR"'); expect(page.text).toContain('/docs/assets/swagger-ui-bundle.js');
  expect(page.headers['content-security-policy']).toContain("script-src 'self'"); expect(page.headers['cache-control']).toBe('no-store');
  const json = await request(app).get('/docs/openapi.json').expect(200);
  expect(json.text).toContain('"openapi":"3.1.0"'); expect(json.text).toContain('/tasks/{id}');
  await request(app).get('/docs/openapi.yaml').expect('Content-Type', /yaml/).expect(200);
  await request(app).get('/docs/assets/swagger-ui.css').expect('Content-Type', /css/).expect(200);
  await request(app).get('/docs/assets/swagger-ui-bundle.js').expect('Content-Type', /javascript/).expect(200);
  const initialization = await request(app).get('/docs/initializer.js').expect(200);
  expect(initialization.text).toContain('persistAuthorization: false'); expect(initialization.text).toContain('validatorUrl: null');
  await request(app).get('/docs/examples/task.json').expect(200);
  await request(app).get('/docs/openapi.json').query({ unexpected: 'field' }).expect(400);
  await request(app).get('/tasks').expect(401);
});
it('interface de documentação local fica desabilitada em produção', async () => {
  const previous = env.NODE_ENV;
  try { env.NODE_ENV = 'production'; const app = createApp(); await request(app).get('/docs/').expect(404); await request(app).get('/docs/openapi.json').expect(404); }
  finally { env.NODE_ENV = previous; }
});
