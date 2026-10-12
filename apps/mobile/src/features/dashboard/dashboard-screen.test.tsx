import { act, cleanup, fireEvent, screen } from '@testing-library/react-native';
import { DashboardScreen } from './dashboard-screen';
import { dashboardFixture, routineFixture, taskFixture } from './fixtures.test-helper';
import { strings } from '../../lib/strings';
const mockPush = jest.fn(); jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('react-native-safe-area-context', () => {
  const mock = jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>('react-native-safe-area-context/jest/mock'); return mock.default;
});
let fixture: Awaited<ReturnType<typeof dashboardFixture>>;
let fetcher: jest.SpyInstance<ReturnType<typeof fetch>, Parameters<typeof fetch>>;
let previous: string | undefined;
const json = (value: object, status = 200) => Promise.resolve(new Response(JSON.stringify(value), { status }));
beforeEach(async () => {
  previous = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid'; fixture = await dashboardFixture(); mockPush.mockClear();
  fetcher = jest.spyOn(globalThis, 'fetch');
});
afterEach(() => { cleanup(); fixture.client.clear(); fetcher.mockRestore(); if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; });
it('exibe tarefas/rotinas reais do transporte, com filtros e atalhos funcionais', async () => {
  fetcher.mockImplementation((url) => { const parsed = new URL(String(url));
    if (parsed.pathname === '/routines') return json({ items: [routineFixture()], nextCursor: null });
    return json({ items: parsed.searchParams.get('status') === 'ABERTA' ? [taskFixture({ dueDate: '2000-01-01', isOverdue: true })] : [], nextCursor: null });
  });
  fixture.show(<DashboardScreen />); await screen.findByText('Tarefa fictícia'); await screen.findByText('Rotina fictícia'); expect(screen.getByText(strings.dashboard.overdue)).toBeTruthy();
  const urls = fetcher.mock.calls.map((call) => new URL(String(call[0]))); expect(urls.filter((url) => url.pathname === '/tasks').every((url) => url.searchParams.get('assigneeId') === 'actor' && url.searchParams.get('limit') === '5')).toBe(true);
  expect(urls.find((url) => url.pathname === '/routines')?.searchParams.get('scheduledFor')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  for (const [label, path] of [[strings.dashboard.tasksShortcut, '/tarefas'], [strings.dashboard.routinesShortcut, '/rotinas'], [strings.checklists.title, '/checklists'], [strings.contacts.title, '/contatos'], [strings.dashboard.profileShortcut, '/perfil']]) {
    fireEvent.press(screen.getByRole('button', { name: label })); expect(mockPush).toHaveBeenLastCalledWith(path === '/rotinas' ? { pathname: '/rotinas', params: { scope: 'today' } } : path);
  }
});
it('estado vazio não é mostrado enquanto tarefas ainda carregam', async () => {
  let finish: (response: Response) => void = () => { throw new Error('Promise ausente.'); };
  fetcher.mockImplementation((url) => { const parsed = new URL(String(url));
    return parsed.searchParams.get('status') === 'ABERTA' ? new Promise((resolve) => { finish = resolve; }) : json({ items: [], nextCursor: null });
  });
  fixture.show(<DashboardScreen />); expect(screen.queryByText(strings.dashboard.emptyTasks)).toBeNull(); await screen.findByText(strings.dashboard.emptyRoutines);
  expect(screen.getByText(strings.feedback.loading)).toBeTruthy(); await act(async () => { finish(new Response(JSON.stringify({ items: [], nextCursor: null }))); });
  await screen.findByText(strings.dashboard.emptyTasks);
});
it('falha de uma seção não apaga a outra e a tentativa manual recupera tarefas', async () => {
  let fail = true;
  fetcher.mockImplementation((url) => { const parsed = new URL(String(url));
    if (parsed.pathname === '/routines') return json({ items: [routineFixture()], nextCursor: null });
    if (parsed.searchParams.get('status') === 'ABERTA') return fail ? json({ error: { code: 'INTERNAL_ERROR', message: 'Interno' } }, 503) : json({ items: [taskFixture()], nextCursor: null });
    return json({ items: [], nextCursor: null });
  });
  fixture.show(<DashboardScreen />); await screen.findByText(strings.feedback.error); expect(screen.getByText('Rotina fictícia')).toBeTruthy(); expect(screen.queryByText(strings.dashboard.emptyTasks)).toBeNull();
  fail = false; fireEvent.press(screen.getByRole('button', { name: strings.feedback.retry })); await screen.findByText('Tarefa fictícia');
});
