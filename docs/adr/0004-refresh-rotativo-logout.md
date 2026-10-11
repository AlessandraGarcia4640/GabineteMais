# ADR-004 — Refresh token rotativo e logout

Status: implementação da issue #25; complementa ADR-003.

O login cria AuthSession com prazo absoluto de sete dias. RefreshToken contém
somente SHA-256 de um token opaco aleatório de 256 bits, sessão e data de consumo.
O token em claro só é devolvido à aplicação; nunca é persistido no banco ou log.
SHA-256 é apropriado para essa entropia aleatória; senhas continuam com Argon2id.

POST /auth/refresh recebe o token atual e devolve novos access/refresh tokens.
O access token inclui sid (identificador da sessão) além de sub e role. A validade
do access permanece 15 minutos; o prazo absoluto da sessão não é estendido.
Perfil e ativação são consultados novamente no banco durante a renovação.

Uma transação bloqueia a linha da sessão, relê o estado, consome o token anterior
e cria o próximo. Reutilizar token consumido revoga toda a família, inclusive o
token emitido pela renovação anterior. Expiração/desativação também revogam.
As regras são verificadas no service; o repository encapsula a transação e os locks.
A revogação é confirmada antes de retornar 401, sem lançar erro dentro da transação.
Falha ao persistir o próximo token desfaz o consumo do anterior.

O cliente deve serializar refresh (single flight). Duas chamadas simultâneas com
o mesmo token podem gerar um 200 e um 401; a detecção de replay revoga a família,
de modo que o token do 200 também deixa de renovar. Não repetir automaticamente
refresh antigo após resposta perdida; exigir novo login quando houver dúvida.

POST /auth/logout revoga a família identificada por qualquer token dela, atual
ou consumido. É idempotente e retorna 204 até para token desconhecido. Preserva
outras sessões do usuário. Login/refresh/logout têm limites independentes de
20/60/120 chamadas por IP em 15 minutos; tentativas de login não bloqueiam logout.

## Relação com a issue #26

JWT assinado continua criptograficamente válido até expirar. A proteção de rotas
da #26 agora valida assinatura, issuer, audience, sub e sid, consulta a sessão
(não revogada/não expirada) e o usuário ativo, e autoriza com perfil atual.
Access tokens de sessão encerrada são rejeitados nas rotas protegidas. Veja ADR-005.
O mobile deve limpar os dois tokens ao sair e usar expo-secure-store na #34.

Os registros de tokens consumidos são retidos para detectar replay. Limpeza de
sessões expiradas será uma tarefa posterior; não apagar histórico durante rotação.
