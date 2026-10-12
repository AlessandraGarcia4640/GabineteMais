import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';
import { useState } from 'react';
interface Props { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean }
export function Button({ label, onPress, loading = false, disabled = false, secondary = false }: Props) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && { backgroundColor: secondary ? theme.surfacePressed : theme.primaryPressed }, focused && styles.focused, (disabled || loading) && styles.dim]}>
    {loading && <ActivityIndicator color={secondary ? theme.primary : theme.surface} />}
    <Text allowFontScaling style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 52, minWidth: theme.touchTarget, borderWidth: 2, borderColor: 'transparent', backgroundColor: theme.primary, borderRadius: theme.radius,
  padding: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 }, label: { color: theme.surface, fontSize: 16, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  secondary: { backgroundColor: theme.surface, borderColor: theme.border }, focused: { borderColor: theme.text }, secondaryLabel: { color: theme.primary }, dim: { opacity: 0.65 } });
