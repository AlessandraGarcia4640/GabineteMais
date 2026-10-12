import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';
interface Props { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean }
export function Button({ label, onPress, loading = false, disabled = false, secondary = false }: Props) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || loading || pressed) && styles.dim]}>
    {loading && <ActivityIndicator color={secondary ? theme.primary : theme.surface} />}
    <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 52, backgroundColor: theme.primary, borderRadius: theme.radius,
  padding: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 }, label: { color: theme.surface, fontSize: 16, fontWeight: '700' },
  secondary: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }, secondaryLabel: { color: theme.primary }, dim: { opacity: 0.65 } });
