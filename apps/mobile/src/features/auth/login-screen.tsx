import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest } from '@gabinete-plus/shared';
import { AuthScreen } from '../../components/auth-screen';
import { Card } from '../../components/card';
import { Button } from '../../components/button';
import { TextField } from '../../components/text-field';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { authMessage } from './errors';
export function LoginScreen() {
  const manager = useSessionManager(); const session = useSession();
  const [visible, setVisible] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const form = useForm<LoginRequest>({ resolver: zodResolver(loginRequestSchema), defaultValues: { email: '', password: '' } });
  const login = useMutation({ mutationFn: (input: LoginRequest) => manager.login(input), retry: false, gcTime: 0 });
  async function submit(input: LoginRequest): Promise<void> {
    setMessage(null);
    try { await login.mutateAsync(input); }
    catch (error) { setMessage(error instanceof Error ? authMessage(error) : strings.auth.unexpected); }
    finally { form.setValue('password', ''); login.reset(); }
  }
  const notice = message ?? (session.errorCode ? strings.auth[session.errorCode] : null);
  return <AuthScreen><View style={styles.header}>
    <Text style={styles.brand}>{strings.brand}</Text><Text accessibilityRole="header" style={styles.title}>{strings.auth.title}</Text>
    <Text style={styles.description}>{strings.auth.subtitle}</Text>
  </View><Card style={styles.form}>
    <Controller control={form.control} name="email" render={({ field, fieldState }) => <TextField label={strings.auth.email} value={field.value}
      onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
      autoComplete="email" textContentType="username" editable={!login.isPending} placeholder={strings.auth.emailPlaceholder}
      errorText={fieldState.error ? strings.auth.invalidEmail : undefined} />} />
    <Controller control={form.control} name="password" render={({ field, fieldState }) => <TextField label={strings.auth.password} value={field.value}
      onChangeText={field.onChange} onBlur={field.onBlur} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false}
      autoComplete="current-password" textContentType="password" editable={!login.isPending} returnKeyType="go"
      onSubmitEditing={() => { if (!login.isPending) void form.handleSubmit(submit)(); }}
      errorText={fieldState.error ? strings.auth.invalidPassword : undefined} />} />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? strings.auth.hidePassword : strings.auth.showPassword}
      onPress={() => setVisible(!visible)} style={styles.visibility}><Text style={styles.link}>{visible ? strings.auth.hidePassword : strings.auth.showPassword}</Text></Pressable>
    {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{notice}</Text>}
    <Button label={login.isPending ? strings.auth.submitting : strings.auth.submit} loading={login.isPending} onPress={() => void form.handleSubmit(submit)()} />
  </Card><Text style={styles.footnote}>{strings.auth.invitation}</Text>
    {Platform.OS === 'web' && <Text style={styles.footnote}>{strings.auth.webSession}</Text>}
  </AuthScreen>;
}
const styles = StyleSheet.create({ header: { gap: 14 }, brand: { color: theme.primary, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  title: { color: theme.text, fontSize: 30, fontWeight: '700' }, description: { color: theme.muted, fontSize: 16, lineHeight: 24 },
  form: { padding: 22, gap: 20, marginBottom: 0 },
  visibility: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end' }, link: { color: theme.primary, fontSize: 14, fontWeight: '600' },
  error: { backgroundColor: theme.errorSurface, color: theme.danger, padding: 14, borderRadius: 10, fontSize: 14, lineHeight: 21 },
  footnote: { color: theme.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 } });
