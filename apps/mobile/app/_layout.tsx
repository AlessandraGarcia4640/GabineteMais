import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '../src/providers/query-provider';
import { SessionProvider, useSession } from '../src/providers/session-provider';
import { SessionGate } from '../src/features/auth/session-gate';
import { strings } from '../src/lib/strings';
function SessionRoutes() {
  const session = useSession();
  return <SessionGate><Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={session.status === 'anonymous'}><Stack.Screen name="login" options={{ title: strings.auth.title }} /></Stack.Protected>
    <Stack.Protected guard={session.status === 'authenticated'}><Stack.Screen name="(tabs)" options={{ title: strings.session.title }} /></Stack.Protected>
  </Stack><StatusBar style="dark" /></SessionGate>;
}
export default function RootLayout() {
  return <QueryProvider><SessionProvider><SafeAreaProvider><SessionRoutes /></SafeAreaProvider></SessionProvider></QueryProvider>;
}
