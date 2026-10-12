import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { backup, restore, parseOptions } from './db-transfer.mjs';
if (process.env.NODE_ENV !== 'test' || !process.env.GABINETE_TEST_CONTAINER) throw new Error('Exige NODE_ENV=test e container explícito do PostgreSQL de teste.');
const directory = await mkdtemp(join(tmpdir(), 'gabinete-ops-')); const file = join(directory, 'roundtrip.dump'); const user = 'gabinete_test'; const source = 'gabinete_test'; const destination = `gabinete_restore_${randomUUID().replaceAll('-', '')}`; const sessionId = randomUUID();
const options = parseOptions(['--container', process.env.GABINETE_TEST_CONTAINER, '--database', source, '--user', user, '--file', file], {});
function command(args) { const result = spawnSync('docker', args, { shell: false, windowsHide: true, encoding: 'utf8' }); if (result.error) throw result.error; if (result.status !== 0) throw new Error(result.stderr || 'Falha Docker/PostgreSQL.'); return result.stdout.trim(); }
function query(database, sql) { return command(['exec', options.container, 'psql', '--username', user, '--dbname', database, '--set', 'ON_ERROR_STOP=1', '-Atc', sql]); }
function fingerprint(database) {
  const tables = ['users', 'user_position_history', 'routines', 'contacts', 'checklist_templates', 'checklist_runs', 'checklist_run_items', 'tasks', 'task_events', '_prisma_migrations'];
  return tables.map((table) => query(database, `SELECT count(*)::text || ':' || COALESCE(md5(string_agg(row_to_json(t)::text, '|' ORDER BY id)), '') FROM ${table} t`));
}
let created = false;
try {
  query(source, `INSERT INTO auth_sessions (id, "userId", "expiresAt") SELECT '${sessionId}', id, CURRENT_TIMESTAMP + INTERVAL '1 day' FROM users ORDER BY id LIMIT 1`);
  const tokenId = randomUUID(); const tokenHash = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  query(source, `INSERT INTO refresh_tokens (id, "sessionId", "tokenHash") VALUES ('${tokenId}', '${sessionId}', '${tokenHash}')`);
  const before = fingerprint(source); await backup(options);
  command(['exec', options.container, 'createdb', '--username', user, destination]); created = true;
  await restore({ ...options, database: destination }, { GABINETE_RESTORE_CONFIRM: destination }); assert.deepEqual(fingerprint(destination), before);
  assert.equal(query(destination, 'SELECT count(*) FROM auth_sessions WHERE "revokedAt" IS NULL'), '0'); assert.equal(query(source, `SELECT count(*) FROM auth_sessions WHERE id = '${sessionId}' AND "revokedAt" IS NULL`), '1');
  assert.equal(query(destination, 'SELECT count(*) FROM refresh_tokens'), '0'); assert.equal(query(source, `SELECT count(*) FROM refresh_tokens WHERE "sessionId" = '${sessionId}'`), '1');
  console.log('Backup/restauração PostgreSQL 16 validados: dados, snapshots, eventos e migrations preservados; sessões antigas revogadas somente no destino.');
} finally {
  if (created) command(['exec', options.container, 'dropdb', '--username', user, destination]);
  query(source, `DELETE FROM auth_sessions WHERE id = '${sessionId}'`); await rm(file, { force: true }); await rmdir(directory);
}
