import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { useState } from 'react';
type Props = PropsWithChildren<{ style?: StyleProp<ViewStyle> } & ({ onPress: () => void; label: string } | { onPress?: never; label?: never })>;
export function Card({ children, style, onPress, label }: Props) {
  const [focused, setFocused] = useState(false);
  if (onPress) return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [styles.card, style, styles.interactive, focused && styles.focused, pressed && styles.pressed]}>{children}</Pressable>;
  return <View style={[styles.card, style]}>{children}</View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, padding: 18, gap: 8, marginBottom: 12 }, interactive: { minHeight: theme.touchTarget, minWidth: theme.touchTarget, borderWidth: 2 }, focused: { borderColor: theme.primary }, pressed: { backgroundColor: theme.surfacePressed } });
