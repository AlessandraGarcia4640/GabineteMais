# ADR 0013 — Manutenção de rotinas no mobile

Status: aceita.

A consulta e manutenção usam os endpoints reais existentes; regras e payloads permanecem em shared/API. O formulário adapta somente a representação de data civil e passos. A validação executável do payload é createRoutineSchema; erros dos passos são mapeados aos campos correspondentes do React Hook Form.

Passos ficam em useFieldArray, com identidade estável para virtualização e reordenação. Não se converte a coleção para texto separado por linhas, pois um passo pode conter quebras de linha. A edição compara valores normalizados com a referência inicial e envia apenas diferenças. Refetches não redefinem silenciosamente o rascunho ou a referência inicial.

A manutenção é oferecida à chefia, verificada também no cliente no momento da chamada, inclusive após renovação de sessão. O servidor mantém a verificação definitiva. FORBIDDEN dispara atualização de perfil; demais códigos de negócio recebem mensagens institucionais. Mutations não são repetidas automaticamente, e sucesso atualiza/invalida as consultas relevantes.

Arquivar usa confirmação explícita e soft delete já existente. Cancelar pelo formulário confirma descarte de alterações. Não há persistência de rascunho nem versionamento otimista de campos; tais capacidades exigiriam contrato próprio e ficam fora desta etapa.
