# Gestão de usuários — issue #27

Todas as rotas exigem Authorization Bearer e usam as regras da #26.

| Método e rota | Acesso | Comportamento |
|---|---|---|
| GET /users | Todos | Equipe paginada; filtros role/isActive |
| GET /users/:id | Todos | Detalhe público e cargo vigente |
| GET /users/:id/positions | Todos | Histórico paginado de cargos |
| POST /users | CHEFE | Cadastro com name, email, password e position |
| PATCH /users/me | Próprio usuário | Nome/e-mail; não permite elevar perfil |
| PATCH /users/:id | CHEFE | Nome/e-mail de membro |
| PATCH /users/:id/position | CHEFE | Cargo e perfil derivados, com histórico |
| DELETE /users/:id | CHEFE | Desativação e revogação de todas as sessões |

Permissão também é verificada no service. Listagens têm limit 20 por padrão,
máximo 100 e cursor por id; manter filtros e usar nextCursor retornado. isActive
aceita true/false como texto na query. Nenhuma resposta inclui hash ou senha.

409 EMAIL_ALREADY_EXISTS indica duplicidade. 409 LAST_ACTIVE_CHIEF impede perder
a última chefia ativa. 404 USER_NOT_FOUND indica alvo inexistente após autorização.
DELETE retorna 204 sem apagar registros; repetir a desativação também retorna 204.
Alteração de nome/e-mail não modifica cargo ou senha; mudança de cargo tem rota própria.

O cadastro administrativo cria conta ativa e histórico inicial, sem emitir sessão
ou enviar e-mail. Senha inicial deve ser transmitida por canal adequado pelo operador;
esta API não automatiza convites. Tela mobile segue na etapa de frontend.

Teste de integração usa banco descartável próprio e verifica paginação, RBAC,
hash, login com e-mail sem distinguir caixa, histórico, desativação e concorrência
da última chefia. Não é necessária migration nova: os modelos vêm das etapas anteriores.
