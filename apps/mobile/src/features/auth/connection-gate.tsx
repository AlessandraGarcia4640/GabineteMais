import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { connectionUrlSchema, connectionFormSchema } from '@gabinete-plus/shared';
import { AuthScreen } from '../../components/auth-screen';
import { Button, TextField } from '../../components';
import { strings } from '../../lib/strings';
import { secureSessionStorage } from './storage';
import { readConnectionUrl, saveConnectionUrl, clearConnectionUrl } from './connection-storage';
interface Connection { url: string; reset: () => Promise<void> }
const ConnectionContext = createContext<Connection | null>(null);
export const useConnection = () => useContext(ConnectionContext);
export function ConnectionGate({ children }: PropsWithChildren) {
  const configured = connectionUrlSchema.safeParse(process.env.EXPO_PUBLIC_API_URL); const client = useQueryClient();
  const [url, setUrl] = useState<string | null>(configured.success ? configured.data : null); const [loading, setLoading] = useState(!configured.success); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const form = useForm<{ url: string }>({ resolver: zodResolver(connectionFormSchema), defaultValues: { url: '' } });
  useEffect(() => { let active = true; if (!configured.success) void readConnectionUrl().then((saved) => { if (active) setUrl(saved); }).catch(() => { if (active) setMessage(strings.connection.storageError); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [configured.success]);
  async function reset() { await secureSessionStorage.clear(); await clearConnectionUrl(); client.clear(); setUrl(null); form.reset({ url: '' }); }
  async function save(input: { url: string }) { setBusy(true); setMessage(null); try { const valid = connectionUrlSchema.parse(input.url); await secureSessionStorage.clear(); await saveConnectionUrl(valid); client.clear(); setUrl(valid); } catch { setMessage(strings.connection.storageError); } finally { setBusy(false); } }
  if (loading) return <AuthScreen><ActivityIndicator /><Text>{strings.auth.restoring}</Text></AuthScreen>;
  if (url) return <ConnectionContext.Provider value={{ url, reset }}>{children}</ConnectionContext.Provider>;
  return <AuthScreen><View style={{ gap: 16 }}><Text accessibilityRole="header">{strings.connection.title}</Text><Text>{strings.connection.help}</Text><Controller control={form.control} name="url" render={({ field, fieldState }) => <TextField label={strings.connection.address} value={field.value} onChangeText={field.onChange} keyboardType="url" autoCapitalize="none" autoCorrect={false} editable={!busy} errorText={fieldState.error ? strings.connection.invalid : undefined} />} />{!!message && <Text accessibilityRole="alert">{message}</Text>}<Button label={strings.connection.connect} loading={busy} onPress={() => void form.handleSubmit(save)()} /></View></AuthScreen>;
}
