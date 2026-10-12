import { restore, parseOptions } from './db-transfer.mjs';
try { await restore(parseOptions(process.argv.slice(2))); console.log('Restauração concluída e sessões anteriores revogadas. Revise contas/perfis e valide a API antes de liberar acesso.'); }
catch (error) { console.error(error instanceof Error ? error.message : 'Falha na restauração. Mantenha a API parada.'); process.exitCode = 1; }
