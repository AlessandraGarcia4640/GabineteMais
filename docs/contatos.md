# Contatos — issue #30

| Método/rota | Acesso | Operação |
|---|---|---|
| GET /contacts | Todos os perfis ativos | Lista paginada com busca e filtros |
| GET /contacts/:id | Todos | Detalhe de contato ativo ou arquivado |
| POST /contacts | CHEFE | Cadastro; 201 e Location |
| PATCH /contacts/:id | CHEFE | Edição parcial |
| DELETE /contacts/:id | CHEFE | Arquivamento; 204 |

Nome (name) e órgão (organization) são obrigatórios. jobTitle, phones, email, notes,
tags e isKeyContact são opcionais. Use email:null, phones:[] ou tags:[] para limpar.
E-mail vazio/telefone inválido são rejeitados. Não enviar autoria, searchText ou
isArchived. Campos omitidos no PATCH são preservados.

Filtros: q (nome/órgão/tags por trecho), organization (igualdade sem distinguir
caixa), tag (exata, normalizada), isKeyContact e isArchived (false padrão).
Booleanos da query aceitam true/false. limit padrão 20/máximo 100; cursor é o
nextCursor anterior, mantendo filtros. Autorizações são verificadas no service.

404 CONTACT_NOT_FOUND indica alvo inexistente. 409 CONTACT_ARCHIVED impede editar
arquivado. Dados são preservados no arquivamento; a próxima etapa de transição
poderá consumir isKeyContact. Dois contatos fictícios compõem o seed, sem canais reais.
Tela mobile e envio de mensagens não estão implementados. Veja ADR-009.
