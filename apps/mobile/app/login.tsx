import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { loginRequest } from '@/src/lib/api';
import { loginSchema, type LoginFormData } from '@/src/schemas/login-schema';
import { useSessionStore } from '@/src/stores/session-store';

export default function LoginScreen() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const setSession = useSessionStore((state) => state.setSession);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (accessToken) {
    return <Redirect href="/(tabs)" />;
  }

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      const session = await loginRequest(email.trim().toLowerCase(), password);
      setSession(session);
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Não foi possível entrar.',
      });
    }
  });

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.brand}>Gabinete+</Text>
        <Text style={styles.subtitle}>Rotinas, continuidade e conhecimento institucional</Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <View>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="nome@gabinete.local"
                  style={styles.input}
                  value={value}
                />
                {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <View>
                <Text style={styles.label}>Senha</Text>
                <TextInput
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Sua senha"
                  secureTextEntry
                  style={styles.input}
                  value={value}
                />
                {errors.password ? (
                  <Text style={styles.error}>{errors.password.message}</Text>
                ) : null}
              </View>
            )}
          />

          {errors.root ? <Text style={styles.error}>{errors.root.message}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.button,
              (pressed || isSubmitting) && styles.buttonPressed,
            ]}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.note}>Use apenas credenciais fictícias no ambiente de demonstração.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: '#173b67',
  },
  subtitle: {
    fontSize: 15,
    color: '#5f6b7a',
    marginBottom: 18,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#27364a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#173b67',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#b42318',
    marginTop: 5,
  },
  note: {
    color: '#667085',
    fontSize: 12,
    marginTop: 8,
  },
});
