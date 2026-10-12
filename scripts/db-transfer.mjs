import { spawn } from 'node:child_process';
import { open, mkdir, rm, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
export function parseOptions(args, env = process.env) {
  if (args[0] === '--') args = args.slice(1);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]; const value = args[index + 1];
    if (!['--container', '--database', '--user', '--file'].includes(key) || !value || values.has(key)) throw new Error('Use --container, --database, --user e --file, sem opções duplicadas.'); values.set(key, value);
  }
  const options = { container: values.get('--container') ?? 'gabinete-plus-postgres', database: values.get('--database') ?? env.POSTGRES_DB ?? 'gabinete_plus', user: values.get('--user') ?? env.POSTGRES_USER ?? 'gabinete', file: values.get('--file') };
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(options.container) || !/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(options.database) || !/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(options.user)) throw new Error('Identificador de container/banco/usuário inválido.');
  if (!options.file?.trim()) throw new Error('Informe --file com o caminho do backup.'); return { ...options, file: resolve(options.file) };
}
export function docker(args, io = {}) {
  return new Promise((resolveDone, reject) => {
    const child = spawn('docker', args, { shell: false, windowsHide: true, stdio: [io.stdin ?? 'ignore', io.stdout ?? 'inherit', 'inherit'] });
    child.once('error', reject); child.once('exit', (code, signal) => code === 0 ? resolveDone() : reject(new Error(`Docker/PostgreSQL falhou (${signal ?? code}).`)));
  });
}
export function dumpArgs(options) { return ['exec', '-i', options.container, 'pg_dump', '--format=custom', '--no-privileges', '--username', options.user, '--dbname', options.database]; }
export function restoreArgs(options) { return ['exec', '-i', options.container, 'pg_restore', '--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error', '--single-transaction', '--username', options.user, '--dbname', options.database]; }
export async function backup(options, execute = docker) {
  await mkdir(dirname(options.file), { recursive: true }); const file = await open(options.file, 'wx', 0o600);
  try { await execute(dumpArgs(options), { stdout: file.fd }); }
  catch (error) { await file.close(); await rm(options.file); throw error; }
  await file.close(); if ((await stat(options.file)).size < 5) { await rm(options.file); throw new Error('Backup vazio; arquivo removido.'); }
}
export async function restore(options, env = process.env, execute = docker) {
  if (env.GABINETE_RESTORE_CONFIRM !== options.database) throw new Error('Restauração substitui o banco de destino. Defina GABINETE_RESTORE_CONFIRM com exatamente seu nome e mantenha a API parada.');
  const file = await open(options.file, 'r');
  try {
    const magic = Buffer.alloc(5); await file.read(magic, 0, 5, 0); if (magic.toString() !== 'PGDMP') throw new Error('Arquivo não é backup custom do PostgreSQL.');
    await execute(restoreArgs(options), { stdin: file.fd });
  } finally { await file.close(); }
  await execute(['exec', '-i', options.container, 'psql', '--username', options.user, '--dbname', options.database, '--set', 'ON_ERROR_STOP=1', '--command', 'BEGIN; UPDATE auth_sessions SET "revokedAt" = COALESCE("revokedAt", CURRENT_TIMESTAMP); DELETE FROM refresh_tokens; COMMIT;']);
}
