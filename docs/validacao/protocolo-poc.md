# Protocolo da prova de conceito — Gabinete+

Estado: preparado; sessões e validação física ainda não executadas.

Objetivo: verificar se o protótipo permite executar RF00–RF06 e compreender a continuidade do gabinete com dados fictícios. Registrar a versão do instalador/commit e o estado do ambiente em todas as sessões.

## Preparação

1. Instalar o APK e verificar acesso à API, migrations e seed de demonstração.
2. Fazer ensaio técnico em dispositivo físico: abertura, configuração de acesso, login, encerramento/reabertura, leitura das listas, perda de rede, recuperação, logout e bloqueio de retorno à área privada.
3. Realizar primeiro uma leitura informal do guia com uma pessoa que nunca usou o app. Registrar dificuldades e corrigir impedimentos antes das sessões.
4. Convidar 4–6 participantes, incluindo pelo menos dois chefes e dois assessores; quando possível, alguém com experiência recente em transição. O convite não foi enviado nesta etapa.
5. Preparar consentimento e identificação por código (P01 etc.). Usar apenas contas e dados fictícios. Gravação só com concordância do participante. Evitar registrar informações de processos, senhas ou pessoas reais nas evidências.

## Sessão individual — aproximadamente 45 minutos

Apresentar o objetivo, explicar que o teste avalia o sistema e pedir que a pessoa verbalize o que tenta fazer. Não ensinar o caminho antes de observar a primeira tentativa. Registrar ajuda recebida, conclusão, tempo aproximado, erro e comentário do participante.

| Cenário | Perfil | Tarefa e critério observado |
|---|---|---|
| C0 / RF00 | Todos | Entrar com conta fictícia e sair; não conseguir reabrir área privada após logout. |
| C1 / RF01 | Chefia | Cadastrar rotina com passos e indicação de essencial; encontrá-la pela busca e conferir o conteúdo. |
| C2 / RF02 | Assessor | Abrir execução do checklist, concluir itens e conferir progresso; reabrir sem duplicar a execução. |
| C3 / RF03 | Chefia | Cadastrar contato fictício com canal e marcação de contato-chave; assessor consulta a informação. |
| C4 / RF04 | Chefia/assessor | Distribuir tarefa ao assessor, iniciar e concluir; observar impedimento de concluir checklist incompleto. |
| C5 / RF05 | Todos/chefia | Encontrar e ler orientação; chefia editar e consultar versão anterior preservada. |
| C6 / RF06 | Sucessor/chefia | Consultar seis seções, identificar contatos e pendências; chefia gerar cópia, alterar uma fonte e reabrir a cópia antiga sem mudança. |

Para assessor, ações de manutenção são demonstradas pela chefia/moderador com conta própria. Não tratar ausência dessas permissões como defeito. Registrar separadamente qualquer tentativa de acesso indevido que seja aceita.

## Encerramento

Aplicar o instrumento SUS conforme a versão validada adotada no projeto, preservando suas dez respostas originais e o método de cálculo. Não substituir SUS por estas perguntas abertas:

1. Quais informações foram mais úteis e quais faltaram para realizar as tarefas?
2. Em qual momento o caminho ou a mensagem ficou pouco claro?
3. Como o guia e as cópias preservadas poderiam ajudar em uma substituição ou mudança de chefia?

## Registro e correções

Preencher o modelo de sessão para cada participante. Classificar defeitos: bloqueante (impede cenário), alto (resultado incorreto ou acesso indevido), médio (dificulta execução), baixo (melhoria). Corrigir e repetir cenários bloqueantes/altos antes de novo aceite; registrar os demais em backlog.

Não atribuir resultados a sessões não realizadas. A validação só estará concluída após evidências de dispositivo físico, leitura por pessoa sem experiência e pelo menos quatro sessões com os perfis previstos.
