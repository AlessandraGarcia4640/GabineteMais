import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
export function Screen({ children, edges = ['bottom'], keyboard = false, style }: PropsWithChildren<{ edges?: Edge[]; keyboard?: boolean; style?: StyleProp<ViewStyle> }>) {
  return <SafeAreaView style={[styles.screen, style]} edges={edges}>{keyboard ? <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>{children}</KeyboardAvoidingView> : children}</SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: theme.background } });
