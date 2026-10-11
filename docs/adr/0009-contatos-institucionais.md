# ADR-009 — Contatos institucionais

Status: implementação da issue #30.

Contatos têm nome, órgão, cargo, telefones, e-mail, observações e tags. Nome e órgão
são obrigatórios; canais podem ser preenchidos depois. E-mail é normalizado em
minúsculas; tags são aparadas, normalizadas e deduplicadas. Telefones preservam
formato e permitem ramal, com validação básica sem verificar existência do canal.

Todos os perfis ativos consultam; CHEFE cria/edita/arquiva. Service também exige
contacts:manage e revalida ator/sessão na transação. Autoria vem do servidor.
isKeyContact marca contatos essenciais para a futura transição, sem montar guia.

Listagens usam cursor por id, ordem crescente, limite padrão 20/máximo 100.
Busca q usa ILIKE sobre texto derivado de nome, órgão e tags; GIN/pg_trgm suporta
busca por trecho. Tag exata usa índice GIN de array. Texto interno de busca não
é aceito no payload nem devolvido na API e é recalculado a cada edição.
A migration habilita pg_trgm no banco; ambiente de implantação deve permitir a
instalação dessa extensão pelo responsável pelas migrations.

DELETE arquiva, preservando referências futuras e dados de contato; é idempotente.
Arquivados ficam fora da lista padrão e não são editáveis, mas podem ser consultados.
Não há exclusão física, restauração ou integração com telefonia/e-mail nesta entrega.
Seed idempotente contém somente dados fictícios e domínios example.invalid.
