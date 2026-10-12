import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useSessionStore } from '@/src/stores/session-store';

const roleLabel = {
  CHEFE: 'Assessor-chefe',
  ASSESSOR: 'Assessor',
  APOIO: 'Apoio',
} as const;

export default function HomeScreen() {
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clearSession);

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Gabinete+</Text>
          <Text style={styles.subtitle}>Início</Text>
        </View>
        <Pressable onPress={clearSession} style={styles.logout}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.welcome}>Olá, {user?.name ?? 'usuário'}.</Text>
        <Text style={styles.role}>
          Perfil: {user ? roleLabel[user.role] : '—'}
        </Text>
        <Text style={styles.body}>
          A autenticação RF00 está conectada. Os módulos de atividades, tarefas,
          equipe e substituições serão adicionados nas próximas etapas.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 24,
  },
  brand: {
    color: '#173b67',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    marginTop: 2,
  },
  logout: {
    borderWidth: 1,
    borderColor: '#b8c5d6',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  logoutText: {
    color: '#173b67',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    gap: 10,
  },
  welcome: {
    fontSize: 22,
    color: '#1d2939',
    fontWeight: '700',
  },
  role: {
    color: '#475467',
    fontSize: 15,
  },
  body: {
    color: '#667085',
    lineHeight: 22,
    marginTop: 8,
  },
});
