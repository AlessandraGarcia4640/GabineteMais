import { Stack } from 'expo-router';
import { strings } from '../../src/lib/strings';
export default function SessionLayout() { return <Stack>
  <Stack.Screen name="index" options={{ title: strings.dashboard.title }} />
  <Stack.Screen name="tarefas" options={{ title: strings.tasks.title }} />
  <Stack.Screen name="rotinas" options={{ title: strings.routines.title }} />
  <Stack.Screen name="perfil" options={{ title: strings.session.title }} />
  <Stack.Screen name="rotina/nova" options={{ title: strings.routines.create }} />
  <Stack.Screen name="rotina/[id]" options={{ title: strings.routines.details }} />
  <Stack.Screen name="rotina/[id]/editar" options={{ title: strings.routines.edit }} />
  <Stack.Screen name="checklists" options={{ title: strings.checklists.models }} />
  <Stack.Screen name="execucoes" options={{ title: strings.checklists.history }} />
  <Stack.Screen name="checklist/nova" options={{ title: strings.checklists.create }} />
  <Stack.Screen name="checklist/[id]" options={{ title: strings.checklists.detail }} />
  <Stack.Screen name="checklist/[id]/editar" options={{ title: strings.checklists.edit }} />
  <Stack.Screen name="execucao/[id]" options={{ title: strings.checklists.run }} />
  <Stack.Screen name="contatos" options={{ title: strings.contacts.title }} />
  <Stack.Screen name="contato/novo" options={{ title: strings.contacts.create }} />
  <Stack.Screen name="contato/[id]" options={{ title: strings.contacts.details }} />
  <Stack.Screen name="contato/[id]/editar" options={{ title: strings.contacts.edit }} />
  <Stack.Screen name="tarefa/nova" options={{ title: strings.tasks.create }} />
  <Stack.Screen name="tarefa/[id]" options={{ title: strings.tasks.details }} />
  <Stack.Screen name="tarefa/[id]/editar" options={{ title: strings.tasks.edit }} />
  <Stack.Screen name="tarefa/[id]/historico" options={{ title: strings.tasks.history }} />
</Stack>; }
