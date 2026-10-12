# Biblioteca de componentes do Gabinete+

Importação pública: `src/components/index.ts`. Importar um arquivo específico também é permitido. Componentes dependem apenas de React Native, tema e textos centrais; não acessam API, sessão, roteador nem regras de negócio. Os fluxos controlam seus valores, callbacks, permissões e estados de consulta.

| Componente | Uso e propriedades |
| --- | --- |
| `Button` | `label`, `onPress`; `loading`, `disabled`, `secondary` opcionais. Carregamento desabilita o comando e anuncia estado ocupado. |
| `TextField` | `label`, `errorText` opcional e propriedades nativas de TextInput, incluindo `value`, `onChangeText`, `onBlur`, `multiline`, `editable`, `secureTextEntry` e `style`. Erro permanece visível e é incluído na dica acessível. Estilo adicional não remove a borda de erro. |
| `Card` | Conteúdo estático ou interativo. A forma interativa exige conjuntamente `onPress` e `label`, com papel de botão. `style` ajusta espaçamento/contexto; superfície, borda e raio vêm do tema. Não aninhar outro card para compor sua superfície. |
| `Choice` | Escolha controlada: `label`, `selected`, `onPress`, `disabled` opcional. Papel de rádio com estado selecionado. O fluxo controla exclusividade entre opções. |
| `Checkbox` | `label`, `checked`, `onChange`, `disabled` opcional. O callback recebe o próximo booleano; não mantém estado próprio. Permissões e marcação otimista ficam no fluxo de checklist. |
| `LoadingState` | Mensagem padrão centralizada ou `message` específica; indica estado ocupado. |
| `EmptyState` | `message` obrigatória, definida conforme o domínio. Não deve substituir carregamento ou erro. |
| `ErrorState` | `retry` obrigatório; `updating` seleciona mensagem de falha ao atualizar, e `message` opcional oferece erro institucional específico. Não repete chamadas automaticamente. |
| `Screen` | Contêiner flex com área segura e fundo do tema; `edges` padrão `['bottom']`, pois o cabeçalho do Expo Router ocupa o topo. `keyboard` habilita KeyboardAvoidingView, sem adicionar ScrollView. `style` opcional no contêiner. |
| `AuthScreen` | Composição de Screen para acesso/perfil, com todas as bordas seguras, teclado e ScrollView centralizado. Usar em formulários curtos; listas virtuais usam Screen diretamente. |

## Exemplos

```tsx
import { Button, Card, Checkbox, ErrorState, Screen, TextField } from '../../components';

<Button label={strings.routines.save} loading={save.isPending}
  onPress={() => void form.handleSubmit(submit)()} />;

<TextField label={strings.contacts.name} value={name}
  onChangeText={setName} errorText={validationMessage} />;

<Card label={contact.name} onPress={() => openContact(contact.id)}>
  <Text>{contact.name}</Text>
  <Text>{contact.organization}</Text>
</Card>;

<Checkbox label={item.text} checked={item.isCompleted}
  disabled={!canMark || mutation.isPending}
  onChange={(done) => mark(item.id, done)} />;

<ErrorState updating retry={() => void query.refetch()} />;

<Screen keyboard>
  <FlashList data={fields} renderItem={renderField}
    contentContainerStyle={{ padding: 20 }}
    keyboardShouldPersistTaps="handled" />
</Screen>;
```

Os exemplos são trechos de composição; seus valores/callbacks vêm dos respectivos fluxos. Textos de UI ficam em `src/lib/strings.ts`; estados genéricos usam `strings.feedback`. Cores e raio vêm de `src/lib/theme.ts`.

## Migração e responsabilidades

Login/perfil, painel, rotinas, contatos, checklists, tarefas e seletores utilizam os componentes. TaskCard/RoutineCard permanecem adaptadores de domínio em dashboard/cards.tsx, compostos sobre Card e sem duplicar superfície ou controles de navegação. Estados de feedback e Choice não pertencem mais a features. Os formulários reutilizam Screen keyboard; SafeAreaView/KeyboardAvoidingView ficam na biblioteca.

Não colocar TanStack Query, Zod de domínio, autorização ou navegação dentro dos controles. Não envolver FlashList em ScrollView: o componente chamador mantém virtualização, paginação e padding. O estado e os dados permanecem nos hooks/formulários já existentes.

## Verificação

`components.test.tsx` cobre comandos ocupados/desabilitados, campo controlado/atributos/estilo, card interativo, seleção, checkbox, feedback e composição de tela. Suites dos fluxos existentes verificam navegação, manutenção, permissões e rollback depois da migração. Os testes não medem contraste, layout em aparelhos ou desempenho da virtualização; essas verificações e a comparação com Figma permanecem manuais.
