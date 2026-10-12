import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../lib/theme';
export function Choice({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} onPress={onPress} disabled={disabled} style={[styles.choice, selected && styles.selected]}>
    <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ choice: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, minHeight: 44, justifyContent: 'center' },
  selected: { backgroundColor: theme.primary }, label: { color: theme.text, fontSize: 14 }, selectedLabel: { color: theme.surface } });
