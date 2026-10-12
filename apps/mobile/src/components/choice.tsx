import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';
import { useState } from 'react';
export function Choice({ label, context, selected, onPress, disabled = false }: { label: string; context?: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="radio" accessibilityLabel={context ? `${context}: ${label}` : label} accessibilityState={{ checked: selected, disabled }} onPress={onPress} disabled={disabled} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[styles.choice, selected && styles.selected, focused && styles.focused, disabled && styles.disabled]}>
    <Text allowFontScaling style={[styles.label, selected && styles.selectedLabel]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ choice: { borderWidth: 2, borderColor: theme.border, borderRadius: 10, padding: 12, minWidth: theme.touchTarget, minHeight: theme.touchTarget, justifyContent: 'center' }, selected: { backgroundColor: theme.primary }, focused: { borderColor: theme.text }, disabled: { opacity: 0.65 }, label: { color: theme.text, fontSize: 14 }, selectedLabel: { color: theme.surface } });
