import { backup, parseOptions } from './db-transfer.mjs';
try { await backup(parseOptions(process.argv.slice(2))); console.log('Backup concluído. Proteja o arquivo e valide sua restauração em banco separado.'); }
catch (error) { console.error(error instanceof Error ? error.message : 'Falha no backup.'); process.exitCode = 1; }
