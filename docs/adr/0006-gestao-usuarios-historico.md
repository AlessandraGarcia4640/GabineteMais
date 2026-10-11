# ADR-006 — Gestão de usuários, cargos e desativação

Status: implementação da issue #27.

Todos os perfis ativos consultam equipe, detalhe público e histórico de cargos.
Somente CHEFE cadastra/edita terceiros, altera cargo e desativa. Edição própria
aceita somente nome/e-mail; senha, role e isActive são rejeitados. Cargo determina
perfil pela matriz da ADR-002. Senha inicial mínima de 12 caracteres recebe Argon2id.
É cadastro administrativo autenticado, sem cadastro público nem envio de convites.
Convites e recuperação/troca de senha ainda requerem entregas específicas.

GET /users e GET /users/:id/positions usam cursor por id, ordem crescente e
limite padrão 20, máximo 100. nextCursor nulo indica fim. Manter filtros entre
páginas; dados podem mudar durante navegação. Histórico inclui períodos encerrados.

Mudança de cargo fecha o período vigente, cria novo e atualiza User.role na mesma
transação; repetir o cargo atual não cria histórico. O fechamento sempre é ao
menos 1 ms posterior ao início, preservando o CHECK mesmo em chamadas rápidas.
Identidade User.id e registros anteriores não mudam. Perfil passa a valer na
próxima chamada protegida, conforme #26.

DELETE /users/:id apenas desativa e revoga todas as sessões na mesma transação.
Nunca remove pessoa nem histórico. É idempotente para alvo já inativo. Não há
reativação nesta entrega; uma futura reativação não deve restaurar sessões antigas.

Mutações revalidam ator, sessão e autorização dentro da transação. Bloqueiam
linhas de chefia em ordem estável e depois ator/alvo. Impedem desativar ou rebaixar
a última chefia ativa, inclusive em alterações simultâneas. A chefia pode alterar
o próprio cargo/desativar-se se outra chefia ativa permanecer.

Novos e-mails/edições são normalizados em minúsculas. Duplicidade é conferida sem
distinguir caixa. Login consulta sem distinguir caixa; se houver duplicatas
legadas ambíguas, nega autenticação em vez de escolher pessoa arbitrariamente.
Nenhum dado legado é removido ou reescrito automaticamente.
