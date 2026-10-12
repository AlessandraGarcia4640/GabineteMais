import { StyleSheet, Text } from 'react-native';
import { Card } from '../../components/card';
import { useMutation } from '@tanstack/react-query';
import { AuthScreen } from '../../components/auth-screen';
import { Button } from '../../components/button';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
export function SessionScreen() {
  const { user } = useSession(); const manager = useSessionManager();
  const logout = useMutation({ mutationFn: () => manager.logout(), retry: false });
  if (!user) return null;
  return <AuthScreen><Text style={styles.brand}>{strings.brand}</Text><Card style={styles.profile}>
    <Text style={styles.description}>{strings.session.welcome}</Text><Text accessibilityRole="header" style={styles.title}>{user.name}</Text>
    <Text style={styles.description}>{strings.session.description}</Text><Text style={styles.label}>{strings.session.profile}</Text>
    <Text style={styles.role}>{strings.session.roles[user.role]}</Text>
  </Card><Button label={logout.isPending ? strings.session.leaving : strings.session.logout} secondary loading={logout.isPending} onPress={() => logout.mutate()} /></AuthScreen>;
}
const styles = StyleSheet.create({ brand: { color: theme.primary, fontSize: 28, fontWeight: '800' }, profile: { padding: 24, gap: 16, marginBottom: 0 },
  title: { color: theme.text, fontSize: 28, fontWeight: '700' }, description: { color: theme.muted, fontSize: 16, lineHeight: 24 }, label: { color: theme.muted, fontSize: 13 }, role: { color: theme.primary, fontSize: 18, fontWeight: '600' } });
