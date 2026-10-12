import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { strings } from '../lib/strings';
import { theme } from '../lib/theme';
import { Button } from './button';
export function LoadingState({ message = strings.feedback.loading }: { message?: string }) { return <View style={styles.state} accessibilityState={{ busy: true }}><ActivityIndicator color={theme.primary} /><Text accessibilityLiveRegion="polite" style={styles.description}>{message}</Text></View>; }
export function EmptyState({ message }: { message: string }) { return <View style={styles.state}><Text style={styles.description}>{message}</Text></View>; }
export function ErrorState({ retry, updating = false, message }: { retry: () => void; updating?: boolean; message?: string }) {
  return <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{message ?? (updating ? strings.feedback.updatingError : strings.feedback.error)}</Text><Button label={strings.feedback.retry} secondary onPress={retry} /></View>;
}
const styles = StyleSheet.create({ state: { padding: 20, gap: 16, alignItems: 'center' }, description: { color: theme.muted, fontSize: 14, lineHeight: 21 }, error: { color: theme.danger, fontSize: 14, fontWeight: '600' } });
