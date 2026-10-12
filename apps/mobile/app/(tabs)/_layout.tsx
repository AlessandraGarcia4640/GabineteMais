import { Stack } from 'expo-router';
import { strings } from '../../src/lib/strings';
export default function SessionLayout() { return <Stack>
  <Stack.Screen name="index" options={{ title: strings.dashboard.title }} />
  <Stack.Screen name="tarefas" options={{ title: strings.dashboard.pendingList }} />
  <Stack.Screen name="rotinas" options={{ title: strings.dashboard.routinesTitle }} />
  <Stack.Screen name="perfil" options={{ title: strings.session.title }} />
</Stack>; }
