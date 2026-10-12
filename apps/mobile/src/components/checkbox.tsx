import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';
import { useState } from 'react';
export function Checkbox({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }} disabled={disabled} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={() => onChange(!checked)} style={[styles.control, focused && styles.focused, disabled && styles.disabled]}>
    <Text allowFontScaling style={styles.label}>{checked ? '☑' : '☐'} {label}</Text></Pressable>;
}
const styles = StyleSheet.create({ control: { minHeight: theme.touchTarget, minWidth: theme.touchTarget, borderWidth: 2, borderColor: 'transparent', borderRadius: 10, padding: 4, justifyContent: 'center' }, focused: { borderColor: theme.primary }, disabled: { opacity: 0.65 }, label: { fontSize: 16, fontWeight: '600', color: theme.text } });
