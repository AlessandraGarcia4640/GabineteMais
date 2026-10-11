# ADR-003 — Login com token de acesso JWT

Status: implementação da issue #24, dependente da #23.

POST /auth/login recebe e-mail e senha. A comparação é feita com Argon2id;
usuário inexistente, senha incorreta e usuário inativo recebem o mesmo 401.
Contas inexistentes também passam por verificação de hash fictício, reduzindo
diferenças de custo. Não há cadastro público nesta entrega.

O access token é JWT HS256, com chave aleatória externa ao código, válida por 15
minutos. Inclui sub (User.id), role, iss, aud, iat, exp e jti. Não inclui senha,
hash, nome ou e-mail. O servidor rejeita configuração sem chave de ao menos
32 caracteres. Cada ambiente usa sua própria chave; os valores de teste do CI
não podem ser usados fora do banco descartável de testes.

O segredo de assinatura é simétrico e exclusivo da API. Consumidores não recebem
a chave. A issue #26 deve fixar algoritmo HS256, issuer e audience ao verificar
tokens e consultar o usuário atual para detectar desativação ou mudança de perfil.
Claims não substituem as verificações de autorização nos services.

O endpoint permite 20 tentativas por IP em 15 minutos, usando memória local ao
processo. É adequado à instância única do protótipo; múltiplas instâncias exigem
store compartilhado. Não habilitar trust proxy indiscriminadamente: configurar
os proxies conhecidos ao introduzir hospedagem. Respostas de login não são cacheáveis.

Refresh/logout foram acrescentados na #25, conforme ADR-004. Autenticação/RBAC
das rotas foram aplicados na #26, conforme ADR-005. Convites e tela de login (#34)
ainda ficam nas próximas entregas.
TLS é necessário ao hospedar a API.
