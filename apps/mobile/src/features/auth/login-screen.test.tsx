import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { loginResponseSchema } from '@gabinete-plus/shared';
import { SessionContext } from '../../providers/session-provider';
import { strings } from '../../lib/strings';
import { SessionManager } from './session-manager';
import { LoginScreen } from './login-screen';
import { SessionScreen } from './session-screen';
import { SessionGate } from './session-gate';
import { AuthFailure } from './errors';
import type { AuthApi } from './api';
import type { SessionStorage, StoredSession } from './storage';
jest.mock('react-native-safe-area-context', () => {
  const mock = jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>('react-native-safe-area-context/jest/mock'); return mock.default;
});
function fixture() {
  const result = loginResponseSchema.parse({ accessToken: 'access-ficticio', refreshToken: 'A'.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z', expiresIn: 900, tokenType: 'Bearer',
    user: { id: 'actor', name: 'Pessoa Fictícia', email: 'pessoa@example.invalid', role: 'ASSESSOR', isActive: true } });
  const login = jest.fn(() => Promise.resolve(result)); const refresh = jest.fn(() => Promise.resolve(result));
  const logout = jest.fn(() => Promise.resolve());
  let saved: StoredSession | null = null;
  const storage: SessionStorage = { read: () => Promise.resolve(saved), save: (value) => { saved = value; return Promise.resolve(); }, clear: () => { saved = null; return Promise.resolve(); } };
  const api: AuthApi = { baseUrl: 'https://api.example.invalid', login, refresh, logout, current: () => Promise.resolve({ user: result.user, permissions: [] }) };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false, gcTime: 0 } } });
  const manager = new SessionManager({ api, storage, clearCache: () => client.clear() });
  return { login, logout, refresh, manager, client, result, storage,
    show(element = <LoginScreen />) { return render(<QueryClientProvider client={client}><SessionContext.Provider value={manager}>{element}</SessionContext.Provider></QueryClientProvider>); } };
}
function fill() {
  fireEvent.changeText(screen.getByLabelText(strings.auth.email), ' pessoa@example.invalid ');
  fireEvent.changeText(screen.getByLabelText(strings.auth.password), 'Senha-ficticia-34');
}
it('formulário inválido mostra mensagens e não chama a API', async () => {
  const f = fixture(); await f.manager.start(); f.show(); fireEvent.press(screen.getByRole('button', { name: strings.auth.submit }));
  await screen.findByText(strings.auth.invalidEmail); expect(screen.getByText(strings.auth.invalidPassword)).toBeTruthy(); expect(f.login).not.toHaveBeenCalled();
});
it('valida e-mail, desabilita envio enquanto carrega e limpa a senha após sucesso', async () => {
  const f = fixture(); await f.manager.start();
  let complete: (value: typeof f.result) => void = () => { throw new Error('Promise ausente.'); };
  f.login.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  f.show(); fill(); fireEvent.press(screen.getByRole('button', { name: strings.auth.submit }));
  expect(await screen.findByRole('button', { name: strings.auth.submitting })).toBeDisabled();
  expect(f.login).toHaveBeenCalledWith({ email: 'pessoa@example.invalid', password: 'Senha-ficticia-34' });
  await act(async () => { complete(f.result); });
  await waitFor(() => expect(f.manager.store.getState().status).toBe('authenticated'));
  expect(screen.getByLabelText(strings.auth.password).props.value).toBe('');
});
it.each(['invalidCredentials', 'network', 'rateLimited'] satisfies ('invalidCredentials' | 'network' | 'rateLimited')[])('mostra mensagem institucional para %s sem dados técnicos', async (code) => {
  const f = fixture(); await f.manager.start(); f.login.mockRejectedValue(new AuthFailure(code)); f.show(); fill();
  fireEvent.press(screen.getByRole('button', { name: strings.auth.submit }));
  await screen.findByText(strings.auth[code]); expect(screen.getByLabelText(strings.auth.password).props.value).toBe('');
  expect(screen.getByRole('button', { name: strings.auth.submit })).not.toBeDisabled(); expect(f.manager.store.getState().status).toBe('anonymous');
});
it('senha começa oculta e controle de visibilidade é acessível', async () => {
  const f = fixture(); await f.manager.start(); f.show();
  expect(screen.getByLabelText(strings.auth.password).props.secureTextEntry).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: strings.auth.showPassword }));
  expect(screen.getByLabelText(strings.auth.password).props.secureTextEntry).toBe(false); expect(screen.getByRole('button', { name: strings.auth.hidePassword })).toBeTruthy();
});
it('recuperação bloqueia conteúdo protegido e permite nova tentativa', async () => {
  const f = fixture(); await f.storage.save({ refreshToken: 'A'.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z', apiUrl: 'https://api.example.invalid' });
  f.refresh.mockRejectedValueOnce(new AuthFailure('network'));
  f.show(<SessionGate><Text>{strings.session.description}</Text></SessionGate>);
  expect(screen.getByText(strings.auth.restoring)).toBeTruthy(); expect(screen.queryByText(strings.session.description)).toBeNull();
  await act(async () => { await f.manager.start(); });
  expect(screen.getByText(strings.auth.recoveryTitle)).toBeTruthy(); fireEvent.press(screen.getByRole('button', { name: strings.auth.retry }));
  await screen.findByText(strings.session.description); expect(f.manager.store.getState().status).toBe('authenticated');
});
it('área autenticada identifica perfil e logout remove identidade', async () => {
  const f = fixture(); await f.manager.login({ email: 'pessoa@example.invalid', password: 'Senha-ficticia-34' }); f.show(<SessionScreen />);
  expect(screen.getByText('Pessoa Fictícia')).toBeTruthy(); expect(screen.getByText(strings.session.roles.ASSESSOR)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: strings.session.logout }));
  await waitFor(() => expect(f.manager.store.getState().status).toBe('anonymous')); expect(screen.queryByText('Pessoa Fictícia')).toBeNull();
});
