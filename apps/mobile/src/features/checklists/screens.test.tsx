import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { dashboardFixture, routineFixture } from '../dashboard/fixtures.test-helper';
import { templateFixture, runFixture } from './fixtures.test-helper';
import { ChecklistDetailScreen, ChecklistFormScreen, ChecklistHistoryScreen, ChecklistListScreen, ChecklistRunScreen } from './screens';
import { ChecklistForm } from './form';
import { optimisticMark } from './model';
import { strings } from '../../lib/strings';
const mockPush = jest.fn(); const mockReplace = jest.fn(); let mockParams: { id?: string; routineId?: string; templateId?: string } = {};
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }), useLocalSearchParams: () => mockParams }));
jest.mock('@shopify/flash-list', () => { const { FlatList } = jest.requireActual<typeof import('react-native')>('react-native'); return { FlashList: FlatList }; });
jest.mock('react-native-safe-area-context', () => { const mock = jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>('react-native-safe-area-context/jest/mock'); return mock.default; });
let fixture: Awaited<ReturnType<typeof dashboardFixture>>; let fetcher: jest.SpyInstance<ReturnType<typeof fetch>, Parameters<typeof fetch>>; let previous: string | undefined;
beforeEach(async () => { previous = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid'; fixture = await dashboardFixture(); fetcher = jest.spyOn(globalThis, 'fetch'); mockParams = {}; mockPush.mockClear(); mockReplace.mockClear(); });
afterEach(async () => { await act(async () => { await new Promise<void>((resolve) => setTimeout(resolve, 60)); }); cleanup(); fixture.client.clear(); fetcher.mockRestore(); if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; });
function chief() { const user = fixture.manager.store.getState().user; if (!user) throw new Error('Usuário ausente.'); fixture.manager.store.setState({ user: { ...user, role: 'CHEFE' } }); }
function response(value: object) { return Promise.resolve(new Response(JSON.stringify(value))); }
it('catálogo pagina por cursor, filtra arquivo e abre modelo', async () => {
  fetcher.mockImplementation((url) => response({ items: [templateFixture({ id: String(url).includes('cursor=') ? 'template-2' : 'template-1' })], nextCursor: String(url).includes('cursor=') ? null : 'template-1' }));
  fixture.show(<ChecklistListScreen />); await screen.findByRole('button', { name: 'Checklist fictício' }); fireEvent.press(screen.getByRole('button', { name: strings.feedback.loadMore }));
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Checklist fictício' })).toHaveLength(2));
  expect(fetcher.mock.calls.some((call) => String(call[0]).includes('cursor=template-1'))).toBe(true);
  fireEvent.press(screen.getByRole('radio', { name: strings.checklists.archived })); await waitFor(() => expect(fetcher.mock.calls.some((call) => String(call[0]).includes('isArchived=true'))).toBe(true));
  const buttons = await screen.findAllByRole('button', { name: 'Checklist fictício' }); fireEvent.press(buttons[0]); expect(mockPush).toHaveBeenCalledWith({ pathname: '/checklist/[id]', params: { id: 'template-1' } });
});
it('lista vazia e falha permitem nova tentativa', async () => {
  fetcher.mockRejectedValue(new Error('offline')); fixture.show(<ChecklistListScreen />); await screen.findByText(strings.feedback.error);
  fetcher.mockImplementation(() => response({ items: [], nextCursor: null })); fireEvent.press(screen.getByRole('button', { name: strings.feedback.retry })); await screen.findByText(strings.checklists.empty);
});
it('histórico filtra pessoa e modelo e navega para execução', async () => {
  mockParams = { templateId: 'template-1' }; fetcher.mockImplementation(() => response({ items: [runFixture()], nextCursor: null })); fixture.show(<ChecklistHistoryScreen />);
  await screen.findByText(strings.checklists.progress(0, 1)); expect(String(fetcher.mock.calls[0]?.[0])).toContain('assigneeId=actor'); expect(String(fetcher.mock.calls[0]?.[0])).toContain('templateId=template-1');
  fireEvent.press(screen.getByRole('radio', { name: strings.checklists.allRuns })); await waitFor(() => expect(String(fetcher.mock.calls.at(-1)?.[0])).not.toContain('assigneeId='));
  fireEvent.press(await screen.findByRole('button', { name: /Checklist fictício/ })); expect(mockPush).toHaveBeenCalledWith({ pathname: '/execucao/[id]', params: { id: 'run-1' } });
});
it('formulário valida, usa passos da rotina e conserva dados após falha', async () => {
  chief(); const saved = jest.fn(); fetcher.mockRejectedValue(new Error('offline')); fixture.show(<ChecklistForm routine={routineFixture({ steps: ['Passo original'] })} onSaved={saved} onCancel={() => undefined} />);
  expect(screen.getByLabelText(strings.checklists.item(0)).props.value).toBe('Passo original'); fireEvent.changeText(screen.getByLabelText(strings.checklists.name), ''); fireEvent.press(screen.getByRole('button', { name: strings.routines.save }));
  await screen.findByText(strings.checklists.invalidTitle); expect(fetcher).not.toHaveBeenCalled(); fireEvent.changeText(screen.getByLabelText(strings.checklists.name), 'Novo modelo');
  fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await screen.findByText(strings.auth.network); expect(screen.getByLabelText(strings.checklists.item(0)).props.value).toBe('Passo original');
  fetcher.mockImplementation(() => response(templateFixture())); fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await waitFor(() => expect(saved).toHaveBeenCalled());
});
it('link direto não concede manutenção ao assessor', () => { fixture.show(<ChecklistFormScreen mode="create" />); expect(screen.getByText(strings.checklists.forbidden)).toBeTruthy(); expect(fetcher).not.toHaveBeenCalled(); });
it('edição reordena itens e envia somente o conteúdo alterado', async () => {
  chief(); const saved = jest.fn(); const template = templateFixture({ items: ['Primeiro\nOrientação', 'Segundo'] }); fetcher.mockImplementation(() => response({ ...template, items: ['Segundo', 'Primeiro\nOrientação'] }));
  fixture.show(<ChecklistForm routine={routineFixture()} template={template} onSaved={saved} onCancel={() => undefined} />); fireEvent.press(screen.getByRole('button', { name: strings.checklists.down(0) }));
  expect(screen.getByLabelText(strings.checklists.item(0)).props.value).toBe('Segundo'); fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(fetcher.mock.calls[0]?.[1]?.method).toBe('PATCH'); expect(fetcher.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ items: ['Segundo', 'Primeiro\nOrientação'] }));
});
it('resposta tardia após sair não restaura o cache da execução', async () => {
  mockParams = { id: 'run-1' }; let finish: ((value: Response) => void) | undefined;
  fetcher.mockImplementation((_url, init) => init?.method === 'PATCH' ? new Promise<Response>((resolve) => { finish = resolve; }) : response(runFixture()));
  fixture.show(<ChecklistRunScreen />); await screen.findByRole('checkbox'); fireEvent.press(screen.getByRole('checkbox')); await screen.findByText(strings.checklists.progress(1, 1));
  await act(async () => { cleanup(); await fixture.manager.logout(); if (!finish) throw new Error('Requisição ausente.'); finish(new Response(JSON.stringify(optimisticMark(runFixture(), 'item-1', true, 'actor')))); });
  expect(fixture.client.getQueryData(['checklist-run', 'run-1', 'actor'])).toBeUndefined();
});
it('início é explícito, valida data e abre a execução retornada', async () => {
  mockParams = { id: 'template-1' }; fetcher.mockImplementation((url, init) => response(init?.method === 'POST' ? runFixture() : String(url).includes('/routines/') ? routineFixture() : templateFixture()));
  fixture.show(<ChecklistDetailScreen />); await screen.findByRole('button', { name: strings.checklists.start }); expect(fetcher.mock.calls.some((call) => call[1]?.method === 'POST')).toBe(false);
  fireEvent.changeText(screen.getByLabelText(strings.checklists.date), '31/02/2026'); fireEvent.press(screen.getByRole('button', { name: strings.checklists.start })); await screen.findByText(strings.routines.validation.specificDate);
  fireEvent.changeText(screen.getByLabelText(strings.checklists.date), '12/10/2026'); fireEvent.press(screen.getByRole('button', { name: strings.checklists.start })); await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: '/execucao/[id]', params: { id: 'run-1' } }));
});
it('marcação otimista aparece antes da resposta e reverte em recusa de tarefa concluída', async () => {
  mockParams = { id: 'run-1' }; let fail: ((value: Response) => void) | undefined;
  fetcher.mockImplementation((_url, init) => init?.method === 'PATCH' ? new Promise<Response>((resolve) => { fail = resolve; }) : response(runFixture()));
  fixture.show(<ChecklistRunScreen />); await screen.findByRole('checkbox', { name: 'Conferir caixa' }); fireEvent.press(screen.getByRole('checkbox', { name: 'Conferir caixa' }));
  await screen.findByText(strings.checklists.progress(1, 1)); expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(true);
  await act(async () => { if (!fail) throw new Error('Requisição ausente.'); fail(new Response(JSON.stringify({ error: { code: 'CHECKLIST_TASK_COMPLETED', message: 'Conflito' } }), { status: 409 })); });
  await screen.findByText(strings.checklists.completedTask); await screen.findByText(strings.checklists.progress(0, 1)); expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
});
it('marcar e desmarcar confirma a resposta do servidor', async () => {
  mockParams = { id: 'run-1' }; let run = runFixture(); fetcher.mockImplementation((_url, init) => { if (init?.method === 'PATCH') run = optimisticMark(run, 'item-1', run.completedItems === 0, 'actor'); return response(run); });
  fixture.show(<ChecklistRunScreen />); await screen.findByRole('checkbox'); fireEvent.press(screen.getByRole('checkbox')); await screen.findByText(strings.checklists.progress(1, 1)); await waitFor(() => expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(false));
  expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(true); fireEvent.press(screen.getByRole('checkbox')); await screen.findByText(strings.checklists.progress(0, 1));
});
it('outra pessoa consulta snapshot mas não pode marcar', async () => { mockParams = { id: 'run-1' }; fetcher.mockImplementation(() => response(runFixture({ assigneeId: 'other' }))); fixture.show(<ChecklistRunScreen />);
  await screen.findByText('Orientação preservada'); expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(true); fireEvent.press(screen.getByRole('checkbox')); expect(fetcher.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(false);
});
it('arquiva somente com confirmação e mantém acesso ao histórico', async () => {
  chief(); mockParams = { id: 'template-1' }; let archived = false; fetcher.mockImplementation((url, init) => {
    if (init?.method === 'DELETE') { archived = true; return Promise.resolve(new Response(null, { status: 204 })); }
    return response(String(url).includes('/routines/') ? routineFixture() : templateFixture({ isArchived: archived }));
  }); fixture.show(<ChecklistDetailScreen />); await screen.findByRole('button', { name: strings.checklists.archive }); fireEvent.press(screen.getByRole('button', { name: strings.checklists.archive }));
  expect(fetcher.mock.calls.some((call) => call[1]?.method === 'DELETE')).toBe(false); fireEvent.press(screen.getByRole('button', { name: strings.checklists.confirmArchive })); await screen.findByText(strings.checklists.archivedLabel);
  expect(screen.queryByRole('button', { name: strings.checklists.start })).toBeNull(); expect(screen.getByRole('button', { name: strings.checklists.history })).toBeTruthy();
});
