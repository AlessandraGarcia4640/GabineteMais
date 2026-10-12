import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { loginResponseSchema, createContactSchema, updateContactSchema } from '@gabinete-plus/shared';
import { taskFixture } from '../dashboard/fixtures.test-helper';
import { contactFixture } from '../contacts/fixtures.test-helper';
import { renderRouter } from 'expo-router/testing-library';
import RootLayout from '../../../app/_layout';
import SessionLayout from '../../../app/(tabs)/_layout';
import { LoginScreen } from './login-screen';
import { SessionScreen } from './session-screen';
import { RoutineListScreen, RoutineDetailScreen, RoutineFormScreen } from '../routines/screens';
import { strings } from '../../lib/strings';
import { DashboardScreen } from '../dashboard/dashboard-screen';
import { TaskListScreen, TaskDetailScreen, TaskFormScreen, TaskHistoryScreen } from '../tasks/screens';
import { ChecklistListScreen, ChecklistHistoryScreen, ChecklistDetailScreen, ChecklistRunScreen, ChecklistFormScreen } from '../checklists/screens';
import { ContactListScreen, ContactDetailScreen, ContactFormScreen } from '../contacts/screens';
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
beforeEach(async () => { await SecureStore.deleteItemAsync('test-reset'); });
afterEach(cleanup);
function authResponse(role: 'CHEFE' | 'ASSESSOR') { return loginResponseSchema.parse({ accessToken: 'access-ficticio', refreshToken: 'A'.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z', tokenType: 'Bearer', expiresIn: 900, user: { id: 'actor', name: 'Pessoa Fictícia', email: 'pessoa@example.invalid', role, isActive: true } }); }
async function enter() {
  await screen.findByRole('button', { name: strings.auth.submit }); fireEvent.changeText(screen.getByLabelText(strings.auth.email), 'pessoa@example.invalid'); fireEvent.changeText(screen.getByLabelText(strings.auth.password), 'Senha-ficticia-42'); fireEvent.press(screen.getByRole('button', { name: strings.auth.submit })); await screen.findByText('Pessoa Fictícia');
}
async function leave() { fireEvent.press(screen.getByRole('button', { name: strings.session.logout })); await screen.findByRole('button', { name: strings.auth.submit }); }
function renderApp(initialUrl = '/') { return renderRouter({ _layout: RootLayout, login: LoginScreen, '(tabs)/_layout': SessionLayout, '(tabs)/index': DashboardScreen,
      '(tabs)/perfil': SessionScreen, '(tabs)/tarefas': TaskListScreen, '(tabs)/rotinas': RoutineListScreen, '(tabs)/rotina/[id]': RoutineDetailScreen,
      '(tabs)/rotina/nova': () => <RoutineFormScreen mode="create" />, '(tabs)/rotina/[id]/editar': () => <RoutineFormScreen mode="edit" />,
      '(tabs)/checklists': ChecklistListScreen, '(tabs)/execucoes': ChecklistHistoryScreen, '(tabs)/checklist/[id]': ChecklistDetailScreen,
      '(tabs)/execucao/[id]': ChecklistRunScreen, '(tabs)/checklist/nova': () => <ChecklistFormScreen mode="create" />, '(tabs)/checklist/[id]/editar': () => <ChecklistFormScreen mode="edit" />,
      '(tabs)/contatos': ContactListScreen, '(tabs)/contato/[id]': ContactDetailScreen, '(tabs)/contato/novo': () => <ContactFormScreen mode="create" />, '(tabs)/contato/[id]/editar': () => <ContactFormScreen mode="edit" />,
      '(tabs)/tarefa/[id]': TaskDetailScreen, '(tabs)/tarefa/nova': () => <TaskFormScreen mode="create" />, '(tabs)/tarefa/[id]/editar': () => <TaskFormScreen mode="edit" />, '(tabs)/tarefa/[id]/historico': TaskHistoryScreen }, { initialUrl }); }
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
    renderApp();
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
it('jornada real: login, tarefa, início, conclusão, histórico e logout', async () => {
  const previous = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid'; let task = taskFixture();
  const fetcher = jest.spyOn(globalThis, 'fetch').mockImplementation((url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === '/auth/login') return Promise.resolve(new Response(JSON.stringify(authResponse('ASSESSOR'))));
    if (path === '/auth/logout') return Promise.resolve(new Response(null, { status: 204 }));
    if (path === '/routines') return Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: null })));
    if (path === '/tasks') return Promise.resolve(new Response(JSON.stringify({ items: [task], nextCursor: null })));
    if (path.endsWith('/status')) { task = taskFixture({ status: task.status === 'ABERTA' ? 'EM_ANDAMENTO' : 'CONCLUIDA' }); return Promise.resolve(new Response(JSON.stringify(task))); }
    if (path.endsWith('/history')) return Promise.resolve(new Response(JSON.stringify({ items: [{ id: 'event-42', taskId: task.id, actorId: 'actor', type: 'STATUS_CHANGED', fromStatus: 'EM_ANDAMENTO', toStatus: 'CONCLUIDA', fromAssigneeId: null, toAssigneeId: null, changedFields: [], createdAt: '2026-10-12T12:00:00Z' }], nextCursor: null })));
    if (path === '/tasks/task-1') return Promise.resolve(new Response(JSON.stringify(task))); return Promise.reject(new Error(`Endpoint não previsto: ${path}`));
  });
  try {
    renderApp(); await enter(); fireEvent.press(await screen.findByRole('button', { name: 'Tarefa fictícia' })); fireEvent.press(await screen.findByRole('button', { name: strings.tasks.start }));
    const complete = await screen.findByRole('button', { name: strings.tasks.complete }); await waitFor(() => expect(complete.props.accessibilityState.disabled).toBe(false)); fireEvent.press(complete);
    await screen.findByText('Concluída · Normal'); fireEvent.press(screen.getByRole('button', { name: strings.tasks.history })); await screen.findByText('Em andamento → Concluída');
    expect(task.status).toBe('CONCLUIDA'); act(() => router.replace('/perfil')); await screen.findByRole('button', { name: strings.session.logout }); await leave();
  } finally { cleanup(); fetcher.mockRestore(); if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; }
});
it('jornada real da chefia: cadastro, erro de rede na edição, recuperação e arquivamento', async () => {
  const previous = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid'; let contact = contactFixture(); let failEdit = true;
  const fetcher = jest.spyOn(globalThis, 'fetch').mockImplementation((url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === '/auth/login') return Promise.resolve(new Response(JSON.stringify(authResponse('CHEFE')))); if (path === '/auth/logout') return Promise.resolve(new Response(null, { status: 204 }));
    if (path === '/tasks' || path === '/routines') return Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: null })));
    if (path === '/contacts' && init?.method === 'POST') { contact = contactFixture(createContactSchema.parse(JSON.parse(String(init.body)))); return Promise.resolve(new Response(JSON.stringify(contact), { status: 201 })); }
    if (path === '/contacts') return Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: null })));
    if (path === '/contacts/contact-1' && init?.method === 'PATCH') { if (failEdit) { failEdit = false; return Promise.resolve(new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Detalhe interno' } }), { status: 503 })); } contact = contactFixture({ ...contact, ...updateContactSchema.parse(JSON.parse(String(init.body))) }); }
    if (path === '/contacts/contact-1' && init?.method === 'DELETE') { contact = contactFixture({ ...contact, isArchived: true }); return Promise.resolve(new Response(null, { status: 204 })); }
    if (path === '/contacts/contact-1') return Promise.resolve(new Response(JSON.stringify(contact))); return Promise.reject(new Error(`Endpoint não previsto: ${path}`));
  });
  try {
    renderApp(); await enter(); fireEvent.press(screen.getByRole('button', { name: strings.contacts.title })); fireEvent.press(await screen.findByRole('button', { name: strings.contacts.create }));
    fireEvent.press(await screen.findByRole('button', { name: strings.routines.save })); await screen.findByText(strings.contacts.validation.name);
    fireEvent.changeText(screen.getByLabelText(strings.contacts.name), 'Contato da jornada'); fireEvent.changeText(screen.getByLabelText(strings.contacts.organization), 'Tribunal fictício'); fireEvent.press(screen.getByRole('button', { name: strings.routines.save }));
    fireEvent.press(await screen.findByRole('button', { name: strings.contacts.edit })); fireEvent.changeText(await screen.findByLabelText(strings.contacts.notes), 'Observação preservada'); fireEvent.press(screen.getByRole('button', { name: strings.routines.save }));
    await screen.findByText(strings.auth.network); expect(screen.getByLabelText(strings.contacts.notes).props.value).toBe('Observação preservada'); fireEvent.press(screen.getByRole('button', { name: strings.routines.save }));
    fireEvent.press(await screen.findByRole('button', { name: strings.contacts.archive })); expect(contact.isArchived).toBe(false); fireEvent.press(screen.getByRole('button', { name: strings.contacts.confirmArchive })); await screen.findByText(strings.contacts.archivedLabel);
    expect(contact.notes).toBe('Observação preservada'); act(() => router.replace('/perfil')); await screen.findByRole('button', { name: strings.session.logout }); await leave();
  } finally { cleanup(); fetcher.mockRestore(); if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; }
});
