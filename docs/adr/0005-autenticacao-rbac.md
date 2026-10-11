# ADR-005 — Autenticação e autorização de rotas

Status: implementação da issue #26; complementa ADR-002, ADR-003 e ADR-004.

O middleware requireAuth aceita somente Authorization Bearer. Verifica assinatura
HS256, typ JWT, issuer, audience, exp, iat (idade máxima 15 minutos), jti, sub e sid.
Tokens antigos sem sid são rejeitados; é necessário novo login. Tokens em query
ou corpo não são aceitos. Falhas de verificação retornam 401 UNAUTHENTICATED com
WWW-Authenticate Bearer. Falha de banco retorna 500, sem liberar acesso.

A cada chamada protegida, consulta sessão e usuário no banco. Sessão deve existir,
pertencer ao sub, estar vigente e não revogada; usuário deve estar ativo. Sem cache
de autorização: logout, replay, expiração e desativação bloqueiam novas chamadas
após a confirmação da alteração. Chamadas já autorizadas em andamento podem concluir.

O perfil atual no banco define permissões. O role do JWT é validado como contrato,
mas não é autoridade para conceder privilégios. Alterações de perfil têm efeito
na próxima chamada sem exigir refresh. O contexto principal é criado no servidor.

## Matriz aplicada

| Operação | CHEFE | ASSESSOR | APOIO |
|---|---|---|---|
| GET /auth/me — próprio usuário e permissões | Sim | Sim | Sim |
| GET /users/:id/permissions — consulta administrativa | Sim | Não | Não |

A consulta administrativa usa team:manage, diferente da consulta geral da equipe
(team:read, prevista para a #27). requireRole barra cedo, mas UserAccessService
também exige a permissão antes de procurar o alvo. Usuário inexistente só retorna
404 à chefia; os demais recebem 403. Não expor hashes ou dados de sessão.

As futuras rotas CRUD devem usar requireAuth e repetir a autorização nos services,
incluindo validação de propriedade quando exigida. Não confiar em role/userId/
permissions enviados pelo cliente. Substituições temporárias ainda não concedem
permissões; serão implementadas no módulo RF06.
