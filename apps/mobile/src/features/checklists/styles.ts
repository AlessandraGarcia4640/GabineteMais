import { StyleSheet } from 'react-native';
import { theme } from '../../lib/theme';
export const styles = StyleSheet.create({ content: { padding: 20 },
  section: { gap: 12, paddingBottom: 20 }, title: { fontSize: 25, fontWeight: '700', color: theme.text }, label: { fontSize: 16, fontWeight: '600', color: theme.text },
  text: { fontSize: 15, lineHeight: 23, color: theme.muted }, error: { color: theme.danger, padding: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
