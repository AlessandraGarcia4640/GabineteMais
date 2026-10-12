import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import RootLayout from '../../../app/_layout';
import SessionLayout from '../../../app/(tabs)/_layout';
import { LoginScreen } from './login-screen';
import { SessionScreen } from './session-screen';
import { strings } from '../../lib/strings';
import { DashboardScreen } from '../dashboard/dashboard-screen';
import { PendingTasksScreen, TodayRoutinesScreen } from '../dashboard/list-screens';
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual<typeof import('react-native')>('react-native'); return { FlashList: FlatList };
});
// Development websocket side effects are outside the navigation test.
jest.mock('expo/src/async-require/messageSocket', () => ({}));
jest.mock('react-native/Libraries/NativeModules/specs/NativeSourceCode', () => ({
  __esModule: true, default: { getConstants: () => ({ scriptURL: 'file://test.bundle' }) },
}));
jest.mock('react-native-safe-area-context', () => {
  const mock = jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>('react-native-safe-area-context/jest/mock'); return mock.default;
});
jest.mock('expo-secure-store', () => {
  let value: string | null = null;
  return { getItemAsync: jest.fn(() => Promise.resolve(value)),
    setItemAsync: jest.fn((_key: string, next: string) => { value = next; return Promise.resolve(); }),
    deleteItemAsync: jest.fn(() => { value = null; return Promise.resolve(); }), WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only' };
});
it('rota privada abre login, sucesso navega para o gabinete e sair impede voltar à área privada', async () => {
  const previous = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid';
  const fetcher = jest.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    if (String(url).endsWith('/auth/login')) return Promise.resolve(new Response(JSON.stringify({
      accessToken: 'access-ficticio', refreshToken: 'A'.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'actor', name: 'Pessoa Fictícia', email: 'pessoa@example.invalid', role: 'ASSESSOR', isActive: true },
    }), { status: 200 }));
    if (String(url).endsWith('/auth/logout')) return Promise.resolve(new Response(null, { status: 204 }));
    if (String(url).includes('/tasks?') || String(url).includes('/routines?')) return Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: null })));
    return Promise.reject(new Error('Endpoint não previsto.'));
  });
  try {
    renderRouter({ _layout: RootLayout, login: LoginScreen, '(tabs)/_layout': SessionLayout, '(tabs)/index': DashboardScreen,
      '(tabs)/perfil': SessionScreen, '(tabs)/tarefas': PendingTasksScreen, '(tabs)/rotinas': TodayRoutinesScreen }, { initialUrl: '/' });
    await screen.findByRole('button', { name: strings.auth.submit }); expect(screen.queryByText('Pessoa Fictícia')).toBeNull();
    fireEvent.changeText(screen.getByLabelText(strings.auth.email), 'pessoa@example.invalid');
    fireEvent.changeText(screen.getByLabelText(strings.auth.password), 'Senha-ficticia-34');
    fireEvent.press(screen.getByRole('button', { name: strings.auth.submit }));
    await screen.findByText('Pessoa Fictícia'); expect(screen.queryByRole('button', { name: strings.auth.submit })).toBeNull();
    await screen.findByText(strings.dashboard.emptyTasks);
    fireEvent.press(screen.getByRole('button', { name: strings.dashboard.profileShortcut }));
    await screen.findByText(strings.session.roles.ASSESSOR);
    fireEvent.press(screen.getByRole('button', { name: strings.session.logout }));
    await screen.findByRole('button', { name: strings.auth.submit });
    await waitFor(() => expect(screen.queryByText('Pessoa Fictícia')).toBeNull());
  } finally {
    fetcher.mockRestore(); if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous;
  }
});
