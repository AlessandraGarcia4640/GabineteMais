import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { AuthScreen } from '../../components/auth-screen';
import { Button } from '../../components/button';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
import { useSession, useSessionManager } from '../../providers/session-provider';
export function SessionGate({ children }: PropsWithChildren) {
  const session = useSession(); const manager = useSessionManager();
  const retry = useMutation({ mutationFn: () => manager.restore(), retry: false });
  const exit = useMutation({ mutationFn: () => manager.logout(), retry: false });
  if (session.status === 'initializing') return <AuthScreen><ActivityIndicator color={theme.primary} size="large" /><Text style={styles.message}>{strings.auth.restoring}</Text></AuthScreen>;
  if (session.status === 'recovery') return <AuthScreen><Text accessibilityRole="header" style={styles.title}>{strings.auth.recoveryTitle}</Text>
    <Text accessibilityRole="alert" style={styles.message}>{session.errorCode ? strings.auth[session.errorCode] : strings.auth.unexpected}</Text>
    <Button label={strings.auth.retry} onPress={() => retry.mutate()} loading={retry.isPending} />
    <Button label={strings.auth.returnToLogin} secondary onPress={() => exit.mutate()} loading={exit.isPending} />
  </AuthScreen>;
  return children;
}
const styles = StyleSheet.create({ message: { textAlign: 'center', color: theme.muted, fontSize: 16, lineHeight: 24 }, title: { color: theme.text, fontSize: 26, fontWeight: '700' } });
