import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
type Props = PropsWithChildren<{ style?: StyleProp<ViewStyle> } & ({ onPress: () => void; label: string } | { onPress?: never; label?: never })>;
export function Card({ children, style, onPress, label }: Props) {
  if (onPress) return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>{children}</Pressable>;
  return <View style={[styles.card, style]}>{children}</View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, padding: 18, gap: 8, marginBottom: 12 }, pressed: { opacity: 0.65 } });
