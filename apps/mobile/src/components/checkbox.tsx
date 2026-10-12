import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';
export function Checkbox({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={() => onChange(!checked)} style={[styles.control, disabled && styles.disabled]}>
    <Text style={styles.label}>{checked ? '☑' : '☐'} {label}</Text></Pressable>;
}
const styles = StyleSheet.create({ control: { minHeight: 44, justifyContent: 'center' }, disabled: { opacity: 0.65 }, label: { fontSize: 16, fontWeight: '600', color: theme.text } });
