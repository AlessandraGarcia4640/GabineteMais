import { Stack } from 'expo-router';
import { strings } from '../../src/lib/strings';
export default function SessionLayout() { return <Stack>
  <Stack.Screen name="index" options={{ title: strings.dashboard.title }} />
  <Stack.Screen name="tarefas" options={{ title: strings.dashboard.pendingList }} />
  <Stack.Screen name="rotinas" options={{ title: strings.routines.title }} />
  <Stack.Screen name="perfil" options={{ title: strings.session.title }} />
  <Stack.Screen name="rotina/nova" options={{ title: strings.routines.create }} />
  <Stack.Screen name="rotina/[id]" options={{ title: strings.routines.details }} />
  <Stack.Screen name="rotina/[id]/editar" options={{ title: strings.routines.edit }} />
</Stack>; }
