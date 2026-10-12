import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, access, rm, rmdir } from 'node:fs/promises';
import { writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backup, restore, parseOptions, dumpArgs, restoreArgs } from './db-transfer.mjs';
test('opções rejeitam identificadores perigosos, duplicação e caminho ausente', () => {
  for (const args of [['--database', '--clean', '--file', 'a'], ['--user', 'a;drop', '--file', 'a'], ['--container', '-evil', '--file', 'a'], ['--file', 'a', '--file', 'b'], []]) assert.throws(() => parseOptions(args, {}));
});
test('argumentos são separados, sem shell e sem criação/exclusão do banco', () => {
  const options = parseOptions(['--', '--file', 'backup com espaço.dump'], {}); assert.ok(dumpArgs(options).includes('--format=custom')); assert.ok(restoreArgs(options).includes('--single-transaction')); assert.ok(!restoreArgs(options).includes('--create')); assert.equal(options.database, 'gabinete_plus');
});
test('backup preserva bytes e recusa sobrescrever arquivo existente', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gabinete-ops-')); const file = join(directory, 'backup.dump'); const options = parseOptions(['--file', file], {});
  try { await backup(options, async (_args, io) => { writeSync(io.stdout, Buffer.from('PGDMP\0\xffconteudo')); }); const bytes = await readFile(file); assert.equal(bytes.subarray(0, 5).toString(), 'PGDMP'); await assert.rejects(backup(options), { code: 'EEXIST' }); assert.deepEqual(await readFile(file), bytes); }
  finally { await rm(file, { force: true }); await rmdir(directory); }
});
test('backup que falha remove somente seu arquivo incompleto', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gabinete-ops-')); const file = join(directory, 'failed.dump'); const preserved = join(directory, 'preserved'); await writeFile(preserved, 'preservado');
  try { await assert.rejects(backup(parseOptions(['--file', file], {}), async () => { throw new Error('Falha fictícia'); })); await assert.rejects(access(file)); assert.equal(await readFile(preserved, 'utf8'), 'preservado'); }
  finally { await rm(file, { force: true }); await rm(preserved); await rmdir(directory); }
});
test('restauração exige confirmação exata e arquivo válido antes de executar', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gabinete-ops-')); const file = join(directory, 'invalid.dump'); await writeFile(file, 'inválido'); const options = parseOptions(['--file', file], {}); let calls = 0;
  try { await assert.rejects(restore(options, {}, async () => { calls++; })); await assert.rejects(restore(options, { GABINETE_RESTORE_CONFIRM: options.database }, async () => { calls++; })); assert.equal(calls, 0); }
  finally { await rm(file); await rmdir(directory); }
});
test('restauração válida revoga sessões e elimina hashes de refresh após restaurar', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gabinete-ops-')); const file = join(directory, 'valid.dump'); await writeFile(file, 'PGDMPficticio'); const options = parseOptions(['--file', file], {}); const commands = [];
  try { await restore(options, { GABINETE_RESTORE_CONFIRM: options.database }, async (args) => { commands.push(args); }); assert.equal(commands.length, 2); assert.ok(commands[0].includes('--exit-on-error')); assert.ok(commands[1].at(-1).includes('UPDATE auth_sessions')); assert.ok(commands[1].at(-1).includes('DELETE FROM refresh_tokens')); }
  finally { await rm(file); await rmdir(directory); }
});
