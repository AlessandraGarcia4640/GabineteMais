# ADR 0019 — Orientações e versões preservadas

Status: aceito.

RF05 mantém o documento atual e uma versão completa para cada edição real. A chefia envia `expectedVersion`; edições concorrentes recebem conflito, sem sobrescrever alterações. Edição sem diferença não gera versão. Arquivamento preserva leitura e histórico.

Versões guardam nome do autor e conteúdo, com restrição única documento/versão e trigger PostgreSQL que rejeita UPDATE e DELETE. A mutação bloqueia chefias, autor e documento na mesma ordem dos demais módulos e revalida perfil e sessão atuais.

O aplicativo oferece Markdown e prévia. Imagens remotas são substituídas por aviso e links não abrem automaticamente, evitando requisições externas durante a leitura. HTML do Markdown permanece desabilitado pelo renderizador.

As dependências da raiz, API e shared foram fixadas nas versões do lock previamente validado, substituindo `latest`; isso impede atualização involuntária da infraestrutura ao incluir o renderizador mobile.

Validação: contratos, navegação e formulários mobile; integração PostgreSQL com cliente mobile real, conflito concorrente, preservação de versões, proteção por trigger, perfil atual e seed idempotente.
