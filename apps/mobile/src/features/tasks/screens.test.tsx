import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTaskSchema, updateTaskSchema, userDetailSchema } from '@gabinete-plus/shared';
import { dashboardFixture, routineFixture, taskFixture } from '../dashboard/fixtures.test-helper';
import { contactFixture } from '../contacts/fixtures.test-helper';
import { runFixture } from '../checklists/fixtures.test-helper';
import { TaskListScreen, TaskDetailScreen, TaskFormScreen, TaskHistoryScreen } from './screens';
import { TaskForm } from './form';
import { ResourcePicker } from './picker';
import { strings } from '../../lib/strings';
const mockPush = jest.fn(); const mockReplace = jest.fn(); let mockParams: { id?: string } = {};
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }), useLocalSearchParams: () => mockParams }));
jest.mock('@shopify/flash-list', () => { const { FlatList } = jest.requireActual<typeof import('react-native')>('react-native'); return { FlashList: FlatList }; });
jest.mock('react-native-safe-area-context', () => { const mock = jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>('react-native-safe-area-context/jest/mock'); return mock.default; });
let fixture: Awaited<ReturnType<typeof dashboardFixture>>; let fetcher: jest.SpyInstance<ReturnType<typeof fetch>, Parameters<typeof fetch>>; let previous: string | undefined;
beforeEach(async () => { jest.useFakeTimers(); previous = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid'; fixture = await dashboardFixture(); fetcher = jest.spyOn(globalThis, 'fetch'); mockParams = {}; mockPush.mockClear(); mockReplace.mockClear(); });
afterEach(() => { cleanup(); fixture.client.clear(); act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); fetcher.mockRestore(); if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; });
function chief() { const user = fixture.manager.store.getState().user; if (!user) throw new Error('Usuário ausente.'); fixture.manager.store.setState({ user: { ...user, role: 'CHEFE' } }); }
function response(value: object) { return Promise.resolve(new Response(JSON.stringify(value))); }
function person(id = 'other', name = 'Outra Pessoa') { return userDetailSchema.parse({ id, name, email: `${id}@example.invalid`, role: 'APOIO', isActive: true, position: 'APOIO', createdAt: '2026-10-12T12:00:00Z', updatedAt: '2026-10-12T12:00:00Z' }); }
it('catálogo pagina, filtra status/prioridade/atraso/equipe e abre detalhe', async () => {
  fetcher.mockImplementation((url) => response({ items: [taskFixture({ id: String(url).includes('cursor=') ? 'second' : 'task-1', title: String(url).includes('cursor=') ? 'Segunda tarefa' : 'Tarefa fictícia' })], nextCursor: String(url).includes('cursor=') ? null : 'next' }));
  fixture.show(<TaskListScreen />); await screen.findByRole('button', { name: 'Tarefa fictícia' }); expect(String(fetcher.mock.calls[0]?.[0])).toContain('assigneeId=actor');
  fireEvent.press(screen.getByRole('button', { name: strings.feedback.loadMore })); await screen.findByRole('button', { name: 'Segunda tarefa' }); fireEvent.press(screen.getByRole('button', { name: 'Tarefa fictícia' })); expect(mockPush).toHaveBeenCalledWith({ pathname: '/tarefa/[id]', params: { id: 'task-1' } });
  fireEvent.press(screen.getByRole('radio', { name: strings.tasks.all })); fireEvent.press(screen.getByRole('radio', { name: strings.dashboard.status.CONCLUIDA })); fireEvent.press(screen.getByRole('radio', { name: strings.dashboard.priority.ALTA })); fireEvent.press(screen.getByRole('radio', { name: strings.tasks.overdue }));
  await waitFor(() => { const url = new URL(String(fetcher.mock.calls.at(-1)?.[0])); expect(url.searchParams.has('assigneeId')).toBe(false); expect(url.searchParams.get('status')).toBe('CONCLUIDA'); expect(url.searchParams.get('priority')).toBe('ALTA'); expect(url.searchParams.get('overdue')).toBe('true'); }); await screen.findByRole('button', { name: 'Tarefa fictícia' });
});
it('catálogo exibe falha recuperável e vazio', async () => {
  fetcher.mockRejectedValue(new Error('offline')); fixture.show(<TaskListScreen />); await screen.findByText(strings.feedback.error); fetcher.mockImplementation(() => response({ items: [], nextCursor: null })); fireEvent.press(screen.getByRole('button', { name: strings.feedback.retry })); await screen.findByText(strings.tasks.empty);
});
it('responsável inicia e conclui mas não edita tarefa criada por outra pessoa', async () => {
  mockParams = { id: 'task-1' }; let task = taskFixture({ createdById: 'other' }); fetcher.mockImplementation((url, init) => {
    if (String(url).includes('/users/')) return response(person());
    if (init?.method === 'PATCH') task = task.status === 'ABERTA' ? taskFixture({ ...task, status: 'EM_ANDAMENTO', startedAt: '2026-10-12T13:00:00Z' }) : taskFixture({ ...task, status: 'CONCLUIDA', completedAt: '2026-10-12T14:00:00Z' }); return response(task);
  }); fixture.show(<TaskDetailScreen />); await screen.findByRole('button', { name: strings.tasks.start }); expect(screen.queryByRole('button', { name: strings.tasks.edit })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: strings.tasks.start })); await screen.findByRole('button', { name: strings.tasks.complete }); fireEvent.press(screen.getByRole('button', { name: strings.tasks.complete })); await screen.findByText(strings.dashboard.status.CONCLUIDA, { exact: false }); expect(screen.queryByRole('button', { name: strings.tasks.complete })).toBeNull();
});
it('conclusão recusada por checklist incompleto preserva status e oferece vínculo', async () => {
  mockParams = { id: 'task-1' }; const task = taskFixture({ status: 'EM_ANDAMENTO', checklistRunId: 'run-1', createdById: 'other' }); fetcher.mockImplementation((url, init) => {
    if (String(url).includes('/users/')) return response(person()); if (String(url).includes('/checklists/')) return response(runFixture());
    if (init?.method === 'PATCH') return Promise.resolve(new Response(JSON.stringify({ error: { code: 'TASK_CHECKLIST_INCOMPLETE', message: 'Conflito' } }), { status: 409 })); return response(task);
  }); fixture.show(<TaskDetailScreen />); await screen.findByRole('button', { name: strings.tasks.complete }); fireEvent.press(screen.getByRole('button', { name: strings.tasks.complete })); await screen.findByText(strings.tasks.incomplete); expect(screen.getByText(strings.dashboard.status.EM_ANDAMENTO, { exact: false })).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Checklist fictício' })); expect(mockPush).toHaveBeenCalledWith({ pathname: '/execucao/[id]', params: { id: 'run-1' } });
});
it('consulta de outra pessoa não oferece comandos nem edição por link direto', async () => {
  mockParams = { id: 'task-1' }; fetcher.mockImplementation((url) => response(String(url).includes('/users/') ? person() : taskFixture({ createdById: 'other', assigneeId: 'other' })));
  fixture.show(<TaskDetailScreen />); await screen.findByText('Tarefa fictícia'); expect(screen.queryByRole('button', { name: strings.tasks.start })).toBeNull(); expect(screen.queryByRole('button', { name: strings.tasks.cancelTask })).toBeNull();
});
it('link direto de edição respeita criador e tarefa encerrada', async () => {
  mockParams = { id: 'task-1' }; fetcher.mockImplementation(() => response(taskFixture({ createdById: 'other' }))); fixture.show(<TaskFormScreen mode="edit" />); await screen.findByText(strings.tasks.forbidden); expect(screen.queryByRole('button', { name: strings.routines.save })).toBeNull();
});
it('cancelamento exige confirmação e preserva tarefa consultável', async () => {
  mockParams = { id: 'task-1' }; let task = taskFixture(); fetcher.mockImplementation((_url, init) => { if (init?.method === 'PATCH') task = taskFixture({ status: 'CANCELADA' }); return response(task); });
  fixture.show(<TaskDetailScreen />); await screen.findByRole('button', { name: strings.tasks.cancelTask }); fireEvent.press(screen.getByRole('button', { name: strings.tasks.cancelTask })); expect(fetcher.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(false);
  fireEvent.press(screen.getByRole('button', { name: strings.tasks.confirmCancel })); await screen.findByText(strings.dashboard.status.CANCELADA, { exact: false }); expect(screen.getByText('Tarefa fictícia')).toBeTruthy(); expect(screen.queryByRole('button', { name: strings.tasks.edit })).toBeNull();
});
it('criador reatribui por seleção de nome e confirmação', async () => {
  mockParams = { id: 'task-1' }; let task = taskFixture(); fetcher.mockImplementation((url, init) => { if (String(url).includes('/users?')) return response({ items: [person()], nextCursor: null }); if (String(url).includes('/users/')) return response(person()); if (init?.method === 'PATCH') task = taskFixture({ assigneeId: 'other' }); return response(task); });
  fixture.show(<TaskDetailScreen />); await screen.findByRole('button', { name: strings.tasks.assign }); fireEvent.press(screen.getByRole('button', { name: strings.tasks.assign })); fireEvent.press(await screen.findByRole('button', { name: 'Outra Pessoa' }));
  expect(fetcher.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(false); fireEvent.press(screen.getByRole('button', { name: strings.tasks.confirmAssign })); await waitFor(() => expect(fetcher.mock.calls.some((call) => String(call[0]).endsWith('/assignee') && call[1]?.body === JSON.stringify({ assigneeId: 'other' }))).toBe(true)); await screen.findByText('Outra Pessoa');
});
it('formulário valida prazo, mantém rascunho em falha e envia tarefa própria', async () => {
  const saved = jest.fn(); fetcher.mockRejectedValue(new Error('offline')); fixture.show(<TaskForm onSaved={saved} onCancel={() => undefined} />); fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await screen.findByText(strings.tasks.validation.title); expect(fetcher).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText(strings.tasks.name), 'Tarefa nova'); fireEvent.changeText(screen.getByLabelText(strings.tasks.dueDate), '31/02/2026'); fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await screen.findByText(strings.tasks.validation.dueDate); expect(fetcher).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText(strings.tasks.dueDate), '12/10/2026'); fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await screen.findByText(strings.auth.network); expect(screen.getByLabelText(strings.tasks.name).props.value).toBe('Tarefa nova');
  fetcher.mockImplementation(() => response(taskFixture())); fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await waitFor(() => expect(saved).toHaveBeenCalled()); expect(createTaskSchema.parse(JSON.parse(String(fetcher.mock.calls.at(-1)?.[1]?.body))).assigneeId).toBe('actor');
});
it('cadastro pela chefia vincula responsável, rotina, contato e checklist compatível', async () => {
  chief(); const saved = jest.fn(); fetcher.mockImplementation((url, init) => {
    if (init?.method === 'POST') return response(taskFixture({ assigneeId: 'other', routineId: 'routine-1', checklistRunId: 'run-1', contactId: 'contact-1' }));
    if (String(url).includes('/users?')) return response({ items: [person()], nextCursor: null }); if (String(url).includes('/routines?')) return response({ items: [routineFixture()], nextCursor: null });
    if (String(url).includes('/contacts?')) return response({ items: [contactFixture()], nextCursor: null }); return response({ items: [runFixture({ assigneeId: 'other' })], nextCursor: null });
  }); fixture.show(<TaskForm onSaved={saved} onCancel={() => undefined} />); fireEvent.changeText(screen.getByLabelText(strings.tasks.name), 'Tarefa vinculada');
  fireEvent.press(screen.getByRole('button', { name: strings.tasks.selectPerson })); fireEvent.press(await screen.findByRole('button', { name: 'Outra Pessoa' }));
  fireEvent.press(screen.getByRole('button', { name: strings.tasks.selectRoutine })); fireEvent.press(await screen.findByRole('button', { name: 'Rotina fictícia' }));
  fireEvent.press(screen.getByRole('button', { name: strings.tasks.selectContact })); fireEvent.press(await screen.findByRole('button', { name: /Secretaria Fictícia/ }));
  fireEvent.press(screen.getByRole('button', { name: strings.tasks.selectRun })); fireEvent.press(await screen.findByRole('button', { name: /Checklist fictício/ }));
  fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await waitFor(() => expect(saved).toHaveBeenCalled()); expect(createTaskSchema.parse(JSON.parse(String(fetcher.mock.calls.at(-1)?.[1]?.body)))).toMatchObject({ assigneeId: 'other', routineId: 'routine-1', contactId: 'contact-1', checklistRunId: 'run-1' });
  expect(fetcher.mock.calls.some((call) => String(call[0]).includes('assigneeId=other') && String(call[0]).includes('routineId=routine-1'))).toBe(true);
});
it('edição limpa orientações e prazo por PATCH mínimo', async () => {
  const saved = jest.fn(); const task = taskFixture({ instructions: 'Original', dueDate: '2026-10-12' }); fetcher.mockImplementation(() => response(taskFixture({ instructions: '', dueDate: null })));
  fixture.show(<TaskForm task={task} onSaved={saved} onCancel={() => undefined} />); fireEvent.changeText(screen.getByLabelText(strings.tasks.instructions), ''); fireEvent.changeText(screen.getByLabelText(strings.tasks.dueDate), ''); fireEvent.press(screen.getByRole('button', { name: strings.routines.save }));
  await waitFor(() => expect(saved).toHaveBeenCalled()); expect(updateTaskSchema.parse(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)))).toEqual({ instructions: '', dueDate: null });
});
it('perda de perfil de chefia permite retomar cadastro como tarefa própria', async () => {
  chief(); const saved = jest.fn(); fetcher.mockImplementation((url) => String(url).includes('/users?') ? response({ items: [person()], nextCursor: null }) : response(taskFixture())); fixture.show(<TaskForm onSaved={saved} onCancel={() => undefined} />);
  fireEvent.changeText(screen.getByLabelText(strings.tasks.name), 'Tarefa própria'); fireEvent.press(screen.getByRole('button', { name: strings.tasks.selectPerson })); fireEvent.press(await screen.findByRole('button', { name: 'Outra Pessoa' }));
  act(() => { const user = fixture.manager.store.getState().user; if (!user) throw new Error('Usuário ausente.'); fixture.manager.store.setState({ user: { ...user, role: 'APOIO' } }); });
  expect(screen.queryByRole('button', { name: strings.tasks.selectPerson })).toBeNull(); fireEvent.press(screen.getByRole('button', { name: strings.tasks.self })); fireEvent.press(screen.getByRole('button', { name: strings.routines.save }));
  await waitFor(() => expect(saved).toHaveBeenCalled()); expect(createTaskSchema.parse(JSON.parse(String(fetcher.mock.calls.at(-1)?.[1]?.body))).assigneeId).toBe('actor');
});
it('seleção trata falha, vazio e paginação de responsáveis ativos', async () => {
  fetcher.mockRejectedValue(new Error('offline')); const selected = jest.fn(); fixture.show(<ResourcePicker kind="person" assigneeId="actor" routineId={null} onSelect={selected} onClose={() => undefined} />); await screen.findByText(strings.feedback.error);
  fetcher.mockImplementation((url) => response({ items: [person(String(url).includes('cursor=') ? 'second' : 'other', String(url).includes('cursor=') ? 'Segunda Pessoa' : 'Outra Pessoa')], nextCursor: String(url).includes('cursor=') ? null : 'other' })); fireEvent.press(screen.getByRole('button', { name: strings.feedback.retry })); await screen.findByRole('button', { name: 'Outra Pessoa' });
  fireEvent.press(screen.getByRole('button', { name: strings.feedback.loadMore })); fireEvent.press(await screen.findByRole('button', { name: 'Segunda Pessoa' })); expect(selected).toHaveBeenCalledWith({ id: 'second', label: 'Segunda Pessoa' }); expect(String(fetcher.mock.calls.at(-1)?.[0])).toContain('isActive=true');
});
it('histórico exibe eventos e pagina sem exibir identificadores técnicos', async () => {
  mockParams = { id: 'task-1' }; fetcher.mockImplementation((url) => response({ items: [{ id: String(url).includes('cursor=') ? 'event-2' : 'event-1', taskId: 'task-1', actorId: 'actor', type: 'STATUS_CHANGED', fromStatus: 'ABERTA', toStatus: 'EM_ANDAMENTO', fromAssigneeId: null, toAssigneeId: null, changedFields: [], createdAt: '2026-10-12T13:00:00Z' }], nextCursor: String(url).includes('cursor=') ? null : 'event-1' }));
  fixture.show(<TaskHistoryScreen />); await screen.findByText(strings.tasks.events.STATUS_CHANGED); expect(screen.getByText('Aberta → Em andamento')).toBeTruthy(); fireEvent.press(screen.getByRole('button', { name: strings.feedback.loadMore })); await waitFor(() => expect(screen.getAllByText(strings.tasks.events.STATUS_CHANGED)).toHaveLength(2));
});
it('resposta tardia após logout não navega nem restaura cache', async () => {
  const saved = jest.fn(); let finish: ((response: Response) => void) | undefined; fetcher.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; })); fixture.show(<TaskForm onSaved={saved} onCancel={() => undefined} />);
  fireEvent.changeText(screen.getByLabelText(strings.tasks.name), 'Tarefa nova'); fireEvent.press(screen.getByRole('button', { name: strings.routines.save })); await waitFor(() => expect(fetcher).toHaveBeenCalled());
  await act(async () => { cleanup(); await fixture.manager.logout(); if (!finish) throw new Error('Requisição ausente.'); finish(new Response(JSON.stringify(taskFixture()))); }); expect(saved).not.toHaveBeenCalled(); expect(fixture.client.getQueryData(['task', 'task-1', 'actor'])).toBeUndefined();
});
