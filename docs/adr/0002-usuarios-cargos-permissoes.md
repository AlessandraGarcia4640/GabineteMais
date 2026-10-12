# ADR-002 — Usuários, cargos e permissões do MVP

Status: aceito para implementação da issue #23.

Uma pessoa tem identidade estável (`User.id`), perfil técnico atual (`CHEFE`,
`ASSESSOR`, `APOIO`) e histórico de cargos. Cargo e perfil são conceitos distintos.
Magistrado gestor e assessor-chefe usam CHEFE; assessor usa ASSESSOR; apoio usa APOIO.
Assessor 1 e assessor 2 são pessoas distintas no mesmo cargo ASSESSOR, não perfis novos.
Substituto é uma condição temporária, não um cargo ou perfil permanente.

Cada alteração futura de cargo/perfil deve encerrar o registro vigente e criar outro,
atualizando User.role na mesma transação. Não excluir usuários: desativar isActive.
O histórico e as referências das tarefas devem continuar ligados ao mesmo User.id.

## Matriz inicial

| Permissão | CHEFE | ASSESSOR | APOIO |
|---|---|---|---|
| Consultar equipe, atividades, tarefas, contatos e orientações | Sim | Sim | Sim |
| Editar próprio perfil | Sim | Sim | Sim |
| Executar tarefa atribuída ao próprio usuário | Sim | Sim | Sim |
| Gerenciar equipe, atividades, contatos e orientações | Sim | Não | Não |
| Distribuir tarefas e gerenciar substituições | Sim | Não | Não |

Esta é a política mínima do MVP. Executar tarefa atribuída exige também verificar
o responsável no service da tarefa; possuir a permissão isoladamente não autoriza
alterar uma tarefa alheia. Usuário inativo não possui permissões.

## Substituições

RF06 deverá registrar titular, substituto, período e escopo explícito. Os direitos
temporários só podem ser calculados no servidor a partir de substituição válida,
ativa e dentro do período. Não alterar o perfil permanente nem aceitar permissões
enviadas pelo aplicativo. Revogar ao encerrar/desativar; evitar conflitos de período.
Até esse módulo existir, nenhuma elevação temporária é aplicada.

## Limites desta entrega

Entrega identidade, histórico inicial, política testável, contratos e seed.
Login/JWT/refresh/convites e endpoints de gestão ficam nas issues #24–#27.
Substituições funcionais ficam na implementação de RF06. Um magistrado fictício
recebe CHEFE no seed; restrições específicas adicionais devem ser explicitadas antes
de acrescentar operações além desta matriz.
