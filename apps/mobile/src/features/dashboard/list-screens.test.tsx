import { act, cleanup, fireEvent, screen } from '@testing-library/react-native';
import { dashboardFixture, routineFixture, taskFixture } from './fixtures.test-helper';
import { PendingTasksScreen, TodayRoutinesScreen } from './list-screens';
import { strings } from '../../lib/strings';
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual<typeof import('react-native')>('react-native'); return { FlashList: FlatList };
});
jest.mock('react-native-safe-area-context', () => {
  const mock = jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>('react-native-safe-area-context/jest/mock'); return mock.default;
});
let fixture: Awaited<ReturnType<typeof dashboardFixture>>;
let fetcher: jest.SpyInstance<ReturnType<typeof fetch>, Parameters<typeof fetch>>; let previous: string | undefined;
beforeEach(async () => { jest.useFakeTimers(); previous = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid'; fixture = await dashboardFixture(); fetcher = jest.spyOn(globalThis, 'fetch'); });
afterEach(() => { cleanup(); fixture.client.clear(); act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); fetcher.mockRestore(); if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; });
it('consulta de tarefas carrega próxima página e permite selecionar em andamento', async () => {
  fetcher.mockImplementation((url) => { const parsed = new URL(String(url)); const cursor = parsed.searchParams.get('cursor'); const progress = parsed.searchParams.get('status') === 'EM_ANDAMENTO';
    return Promise.resolve(new Response(JSON.stringify({ items: [taskFixture({ id: progress ? 'progress' : cursor ? 'second' : 'first', title: progress ? 'Em execução' : cursor ? 'Segunda página' : 'Primeira página', status: progress ? 'EM_ANDAMENTO' : 'ABERTA' })], nextCursor: !progress && !cursor ? 'next' : null })));
  });
  fixture.show(<PendingTasksScreen />); await screen.findByText('Primeira página'); fireEvent.press(screen.getByRole('button', { name: strings.dashboard.loadMore }));
  await screen.findByText('Segunda página'); expect(screen.getByText('Primeira página')).toBeTruthy(); expect(fetcher.mock.calls.some((call) => String(call[0]).includes('cursor=next'))).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: strings.dashboard.progress })); await screen.findByText('Em execução'); expect(screen.queryByText('Primeira página')).toBeNull();
});
it('erro ao carregar mais preserva registros e oferece tentativa manual', async () => {
  fetcher.mockImplementation((url) => String(url).includes('cursor=') ? Promise.resolve(new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Interno' } }), { status: 503 }))
    : Promise.resolve(new Response(JSON.stringify({ items: [routineFixture()], nextCursor: 'next' }))));
  fixture.show(<TodayRoutinesScreen />); await screen.findByText('Rotina fictícia'); fireEvent.press(screen.getByRole('button', { name: strings.dashboard.loadMore }));
  await screen.findByText(strings.dashboard.updatingError); expect(screen.getByText('Rotina fictícia')).toBeTruthy(); expect(screen.getByRole('button', { name: strings.dashboard.retry })).toBeTruthy();
});
