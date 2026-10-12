import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { dashboardFixture, routineFixture } from '../dashboard/fixtures.test-helper';
import { RoutineForm } from './form';
import { RoutineDetailScreen, RoutineFormScreen, RoutineListScreen } from './screens';
import { strings } from '../../lib/strings';
const mockPush = jest.fn(); const mockReplace = jest.fn(); let mockParams: { id?: string; scope?: string } = {};
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }), useLocalSearchParams: () => mockParams }));
jest.mock('@shopify/flash-list', () => { const { FlatList } = jest.requireActual<typeof import('react-native')>('react-native'); return { FlashList: FlatList }; });
jest.mock('react-native-safe-area-context', () => { const mock = jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>('react-native-safe-area-context/jest/mock'); return mock.default; });
let fixture: Awaited<ReturnType<typeof dashboardFixture>>; let fetcher: jest.SpyInstance<ReturnType<typeof fetch>, Parameters<typeof fetch>>; let previous: string | undefined;
beforeEach(async () => { jest.useFakeTimers(); previous = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid'; fixture = await dashboardFixture(); fetcher = jest.spyOn(globalThis, 'fetch'); mockParams = {}; mockPush.mockClear(); mockReplace.mockClear(); });
afterEach(() => { cleanup(); fixture.client.clear(); act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); fetcher.mockRestore(); if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; });
function chief(): void { const user = fixture.manager.store.getState().user; if (!user) throw new Error('Usuário ausente.'); fixture.manager.store.setState({ user: { ...user, role: 'CHEFE' } }); }
it('catálogo busca, filtra e abre detalhes; assessor não recebe botão de cadastro', async () => {
  fetcher.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ items: [routineFixture()], nextCursor: null }))));
  fixture.show(<RoutineListScreen />); await screen.findByRole('button', { name: 'Rotina fictícia' }); expect(screen.queryByRole('button', { name: strings.routines.create })).toBeNull();
  fireEvent.changeText(screen.getByLabelText(strings.routines.search), ' e-mail '); fireEvent.press(screen.getByRole('button', { name: strings.routines.searchAction }));
  await waitFor(() => expect(fetcher.mock.calls.some((call) => String(call[0]).includes('q=e-mail'))).toBe(true));
  fireEvent.press(screen.getByRole('radio', { name: strings.routines.archived }));
  await waitFor(() => expect(fetcher.mock.calls.some((call) => String(call[0]).includes('isArchived=true'))).toBe(true));
  fireEvent.press(await screen.findByRole('button', { name: 'Rotina fictícia' })); expect(mockPush).toHaveBeenCalledWith({ pathname: '/rotina/[id]', params: { id: 'routine-1' } });
});
it('link direto de criação não habilita manutenção para assessor', async () => {
  fixture.show(<RoutineFormScreen mode="create" />); expect(screen.getByText(strings.routines.forbidden)).toBeTruthy(); expect(fetcher).not.toHaveBeenCalled();
});
it('formulário bloqueia dados inválidos, preserva entrada em falha e permite tentar salvar', async () => {
  chief(); const saved = jest.fn(); fetcher.mockResolvedValue(new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Interno' } }), { status: 503 }));
  fixture.show(<RoutineForm onSaved={saved} onCancel={() => undefined} />); fireEvent.press(screen.getByRole('button', { name: strings.routines.save }));
  await screen.findByText(strings.routines.validation.title); expect(fetcher).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText(strings.routines.name), 'Rotina nova'); fireEvent.changeText(screen.getByLabelText(strings.routines.category), 'Administrativo');
  fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await screen.findByText(strings.auth.network);
  expect(screen.getByLabelText(strings.routines.name).props.value).toBe('Rotina nova');
  fetcher.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(routineFixture({ title: 'Rotina nova' })), { status: 201 })));
  fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await waitFor(() => expect(saved).toHaveBeenCalled());
});
it('editar mantém opcionais e envia somente alteração explícita', async () => {
  chief(); const routine = routineFixture({ steps: ['Primeiro\ncom orientação', 'Segundo'], specificDate: '2027-02-01', defaultPosition: 'APOIO' }); const saved = jest.fn();
  fetcher.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ ...routine, title: 'Título atualizado' }))));
  fixture.show(<RoutineForm routine={routine} onSaved={saved} onCancel={() => undefined} />);
  fireEvent.changeText(screen.getByLabelText(strings.routines.name), 'Título atualizado'); fireEvent.press(screen.getByRole('button', { name: strings.routines.save }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(fetcher.mock.calls[0]?.[1]?.method).toBe('PATCH'); expect(fetcher.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ title: 'Título atualizado' }));
});
it('reordenar passos mantém o conteúdo multiline e altera somente steps', async () => {
  chief(); const routine = routineFixture({ steps: ['Primeiro\ncom orientação', 'Segundo'] }); const saved = jest.fn();
  fetcher.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ ...routine, steps: ['Segundo', 'Primeiro\ncom orientação'] }))));
  fixture.show(<RoutineForm routine={routine} onSaved={saved} onCancel={() => undefined} />);
  fireEvent.press(screen.getByRole('button', { name: strings.routines.moveDown(0) }));
  expect(screen.getByLabelText(strings.routines.step(0)).props.value).toBe('Segundo'); fireEvent.press(screen.getByRole('button', { name: strings.routines.save }));
  await waitFor(() => expect(saved).toHaveBeenCalled()); expect(fetcher.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ steps: ['Segundo', 'Primeiro\ncom orientação'] }));
});
it('cancelar formulário alterado requer confirmação de descarte', async () => {
  chief(); const cancel = jest.fn(); fixture.show(<RoutineForm onSaved={() => undefined} onCancel={cancel} />);
  fireEvent.changeText(screen.getByLabelText(strings.routines.name), 'Rascunho fictício'); fireEvent.press(screen.getByRole('button', { name: strings.routines.cancel }));
  expect(screen.getByText(strings.routines.unsavedTitle)).toBeTruthy(); expect(cancel).not.toHaveBeenCalled(); fireEvent.press(screen.getByRole('button', { name: strings.routines.discard })); expect(cancel).toHaveBeenCalledTimes(1);
});
it('arquivamento exige confirmação e detalhe arquivado não oferece edição', async () => {
  chief(); mockParams = { id: 'routine-1' }; let archived = false;
  fetcher.mockImplementation((_url, init) => { if (init?.method === 'DELETE') { archived = true; return Promise.resolve(new Response(null, { status: 204 })); }
    return Promise.resolve(new Response(JSON.stringify(routineFixture({ isArchived: archived })))); });
  fixture.show(<RoutineDetailScreen />); await screen.findByRole('button', { name: strings.routines.archive });
  fireEvent.press(screen.getByRole('button', { name: strings.routines.archive })); expect(fetcher.mock.calls.some((call) => call[1]?.method === 'DELETE')).toBe(false);
  fireEvent.press(screen.getByRole('button', { name: strings.routines.confirmArchive })); await screen.findByText(strings.routines.archivedLabel);
  expect(screen.queryByRole('button', { name: strings.routines.edit })).toBeNull();
});
