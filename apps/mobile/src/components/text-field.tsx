import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../lib/theme';
interface Props extends TextInputProps { label: string; errorText?: string }
export function TextField({ label, errorText, style, ...props }: Props) {
  return <View style={styles.field}><Text allowFontScaling style={styles.label}>{label}</Text>
    <TextInput {...props} allowFontScaling={props.allowFontScaling ?? true} accessibilityLabel={label} accessibilityState={{ disabled: props.editable === false }} accessibilityHint={[props.accessibilityHint, errorText].filter(Boolean).join('. ') || undefined} placeholderTextColor={theme.muted} selectionColor={theme.primary} style={[styles.input, style, !!errorText && styles.invalid]} />
    {!!errorText && <Text allowFontScaling accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errorText}</Text>}
  </View>;
}
const styles = StyleSheet.create({ field: { gap: 8 }, label: { fontSize: 14, fontWeight: '600', color: theme.text },
  input: { minHeight: 52, borderWidth: 1, borderColor: theme.border, borderRadius: 10, backgroundColor: theme.surface, padding: 14, color: theme.text, fontSize: 16 },
  invalid: { borderColor: theme.danger }, error: { fontSize: 13, color: theme.danger } });
