import { useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userIdParamsSchema } from '@gabinete-plus/shared';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { strings } from '../../lib/strings';
import { Button } from '../../components/button';
import { TextField } from '../../components/text-field';
import { Choice } from '../routines/choice';
import { useRoutine } from '../routines/hooks';
import { LoadingState, EmptyState, ErrorState } from '../dashboard/cards';
import { gabineteDate, displayDate } from '../dashboard/model';
import { checklistError, useChecklistsApi, useMarkItem, useRun, useRuns, useTemplate, useTemplates } from './hooks';
import { dateInput, startFormSchema, startPayload } from './model';
import { ChecklistForm } from './form';
import { styles } from './styles';
function identifier(value: string | string[] | undefined): string | undefined { const valid = userIdParamsSchema.safeParse({ id: value }); return valid.success ? valid.data.id : undefined; }
function Page<T extends { id: string }>({ data, query, header, empty, render }: { data: T[]; header: ReactElement; empty: string; render: (item: T) => ReactElement;
  query: { isPending: boolean; isError: boolean; isRefetching: boolean; isFetchingNextPage: boolean; hasNextPage: boolean; isFetchNextPageError: boolean; refetch: () => Promise<object>; fetchNextPage: () => Promise<object> } }) {
  return <SafeAreaView style={styles.screen} edges={['bottom']}>{query.isPending ? <View>{header}<LoadingState /></View> : query.isError && !data.length ? <View>{header}<ErrorState retry={() => void query.refetch()} /></View> :
    <FlashList data={[...new Map(data.map((item) => [item.id, item])).values()]} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} ListHeaderComponent={header} renderItem={({ item }) => render(item)}
      refreshing={query.isRefetching} onRefresh={() => void query.refetch()} ListEmptyComponent={<EmptyState message={empty} />}
      ListFooterComponent={<View style={styles.section}>{query.isError && <ErrorState updating retry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch(); }} />}
        {query.hasNextPage && <Button label={strings.dashboard.loadMore} loading={query.isFetchingNextPage} disabled={query.isRefetching} onPress={() => void query.fetchNextPage()} />}</View>} />}</SafeAreaView>;
}
export function ChecklistListScreen() {
  const params = useLocalSearchParams(); const routineId = identifier(params.routineId); const [archived, setArchived] = useState(false); const query = useTemplates(archived, routineId); const router = useRouter();
  return <Page query={query} data={query.data?.pages.flatMap((page) => page.items) ?? []} empty={strings.checklists.empty}
    header={<View style={styles.section}><Button label={strings.checklists.history} secondary onPress={() => router.push('/execucoes')} />
      <View style={styles.choices}><Choice label={strings.checklists.active} selected={!archived} onPress={() => setArchived(false)} /><Choice label={strings.checklists.archived} selected={archived} onPress={() => setArchived(true)} /></View></View>}
    render={(item) => <Pressable style={styles.card} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => router.push({ pathname: '/checklist/[id]', params: { id: item.id } })}><Text style={styles.label}>{item.title}</Text><Text>{strings.checklists.version(item.version)}</Text></Pressable>} />;
}
export function ChecklistHistoryScreen() {
  const params = useLocalSearchParams(); const templateId = identifier(params.templateId); const [mine, setMine] = useState(true); const query = useRuns(mine, templateId); const router = useRouter();
  return <Page query={query} data={query.data?.pages.flatMap((page) => page.items) ?? []} empty={strings.checklists.emptyRuns}
    header={<View style={styles.section}><View style={styles.choices}><Choice label={strings.checklists.mine} selected={mine} onPress={() => setMine(true)} /><Choice label={strings.checklists.allRuns} selected={!mine} onPress={() => setMine(false)} /></View></View>}
    render={(item) => <Pressable style={styles.card} accessibilityRole="button" accessibilityLabel={`${item.titleSnapshot} ${displayDate(item.periodStart)}`} onPress={() => router.push({ pathname: '/execucao/[id]', params: { id: item.id } })}>
      <Text style={styles.label}>{item.titleSnapshot}</Text><Text>{item.routineTitleSnapshot}</Text><Text>{displayDate(item.periodStart)} · {strings.checklists.status[item.status]}</Text><Text>{strings.checklists.progress(item.completedItems, item.totalItems)}</Text></Pressable>} />;
}
export function ChecklistDetailScreen() {
  const params = useLocalSearchParams(); const id = identifier(params.id); const query = useTemplate(id); const routine = useRoutine(query.data?.routineId); const api = useChecklistsApi();
  const { user } = useSession(); const manager = useSessionManager(); const router = useRouter(); const client = useQueryClient(); const [confirm, setConfirm] = useState(false);
  const form = useForm({ resolver: zodResolver(startFormSchema), defaultValues: { date: dateInput(gabineteDate()) } });
  const start = useMutation({ retry: false, mutationFn: (value: { date: string }) => api.start(id ?? '', startPayload(value.date)), onSuccess: (run) => {
    if (manager.store.getState().user?.id !== user?.id || manager.store.getState().status !== 'authenticated') return;
    client.setQueryData(['checklist-run', run.id, user?.id], run); void client.invalidateQueries({ queryKey: ['checklist-runs'] }); router.push({ pathname: '/execucao/[id]', params: { id: run.id } });
  } });
  const archive = useMutation({ retry: false, mutationFn: () => api.archive(id ?? ''), onSuccess: async () => {
    setConfirm(false); await Promise.all([client.invalidateQueries({ queryKey: ['checklist-template', id] }), client.invalidateQueries({ queryKey: ['checklist-templates'] })]);
  } });
  if (!id) return <EmptyState message={strings.checklists.notFound} />;
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <View><Text style={styles.error}>{checklistError(query.error)}</Text><ErrorState retry={() => void query.refetch()} /></View>;
  const template = query.data; const blocked = template.isArchived || routine.data?.isArchived; const busy = start.isPending || archive.isPending;
  return <SafeAreaView style={styles.screen} edges={['bottom']}><FlashList data={template.items.map((text, index) => ({ text, index }))} keyExtractor={(item) => String(item.index)} contentContainerStyle={styles.content}
    ListHeaderComponent={<View style={styles.section}><Text accessibilityRole="header" style={styles.title}>{template.title}</Text><Text>{strings.checklists.version(template.version)}</Text>
      <Button label={routine.data?.title ?? strings.routines.details} secondary onPress={() => router.push({ pathname: '/rotina/[id]', params: { id: template.routineId } })} />
      {blocked && <Text>{strings.checklists.archivedLabel}</Text>}</View>}
    renderItem={({ item }) => <View style={styles.card}><Text style={styles.label}>{strings.checklists.item(item.index)}</Text><Text style={styles.text}>{item.text}</Text></View>}
    ListFooterComponent={<View style={styles.section}><Button label={strings.checklists.history} secondary onPress={() => router.push({ pathname: '/execucoes', params: { templateId: template.id } })} />
      {routine.isPending && <LoadingState />}{routine.isError && <ErrorState retry={() => void routine.refetch()} />}
      {!blocked && !!routine.data && <><Text>{strings.checklists.startHelp}</Text><Controller control={form.control} name="date" render={({ field, fieldState }) => <TextField label={strings.checklists.date} placeholder={strings.routines.datePlaceholder} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} editable={!busy} errorText={fieldState.error ? strings.routines.validation.specificDate : undefined} />} />
        <Button label={strings.checklists.start} loading={start.isPending} disabled={busy} onPress={() => void form.handleSubmit((value) => start.mutate(value))()} />
        {user?.role === 'CHEFE' && <Button label={strings.checklists.edit} disabled={busy} secondary onPress={() => router.push({ pathname: '/checklist/[id]/editar', params: { id: template.id } })} />}</>}
      {start.isError && <Text accessibilityRole="alert" style={styles.error}>{checklistError(start.error)}</Text>}
      {archive.isError && <Text accessibilityRole="alert" style={styles.error}>{checklistError(archive.error)}</Text>}
      {user?.role === 'CHEFE' && !template.isArchived && (!confirm ? <Button label={strings.checklists.archive} disabled={busy} secondary onPress={() => setConfirm(true)} /> : <><Text>{strings.checklists.archiveHelp}</Text><Button label={strings.checklists.confirmArchive} loading={archive.isPending} disabled={busy} onPress={() => archive.mutate()} /><Button label={strings.routines.cancel} secondary disabled={busy} onPress={() => setConfirm(false)} /></>)}
    </View>} /></SafeAreaView>;
}
export function ChecklistRunScreen() {
  const params = useLocalSearchParams(); const id = identifier(params.id); const query = useRun(id); const mark = useMarkItem(id); const { user } = useSession();
  if (!id) return <EmptyState message={strings.checklists.notFound} />;
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <View><Text style={styles.error}>{checklistError(query.error)}</Text><ErrorState retry={() => void query.refetch()} /></View>;
  const run = query.data; const editable = user?.role === 'CHEFE' || run.assigneeId === user?.id;
  return <SafeAreaView style={styles.screen} edges={['bottom']}><FlashList data={run.items} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
    ListHeaderComponent={<View style={styles.section}><Text accessibilityRole="header" style={styles.title}>{run.titleSnapshot}</Text><Text>{run.routineTitleSnapshot}</Text><Text>{displayDate(run.periodStart)} · {strings.checklists.version(run.templateVersion)}</Text>
      <Text>{strings.checklists.status[run.status]}</Text><Text accessibilityLiveRegion="polite">{strings.checklists.progress(run.completedItems, run.totalItems)}</Text>
      <Text>{strings.checklists.snapshot}</Text><Text style={styles.text}>{run.instructionsSnapshot}</Text><Text>{run.assigneeId === user?.id ? strings.checklists.owner : editable ? strings.checklists.chiefCanMark : strings.checklists.readOnly}</Text>
      {mark.isError && <Text accessibilityRole="alert" style={styles.error}>{checklistError(mark.error)}</Text>}</View>}
    renderItem={({ item }) => <View style={styles.card}><Pressable accessibilityRole="checkbox" accessibilityLabel={item.text} accessibilityState={{ checked: item.isCompleted, disabled: !editable || mark.isPending || query.isRefetching }}
      disabled={!editable || mark.isPending || query.isRefetching} onPress={() => mark.mark(item.id, !item.isCompleted)}><Text style={styles.label}>{item.isCompleted ? '☑' : '☐'} {item.text}</Text></Pressable>
      {item.completedById && item.completedAt && <MarkAuthor id={item.completedById} date={item.completedAt} />}</View>} /></SafeAreaView>;
}
function MarkAuthor({ id, date }: { id: string; date: string }) {
  const api = useChecklistsApi(); const { user } = useSession(); const person = useQuery({ queryKey: ['checklist-person', id, user?.id], enabled: !!user && user.id !== id, retry: false, queryFn: ({ signal }) => api.person(id, signal) });
  return <Text style={styles.text}>{strings.checklists.marked(user?.id === id ? user.name : person.data?.name ?? strings.checklists.personUnavailable, new Date(date).toLocaleString('pt-BR'))}</Text>;
}
export function ChecklistFormScreen({ mode }: { mode: 'create' | 'edit' }) {
  const params = useLocalSearchParams(); const id = identifier(params.id); const { user } = useSession(); const query = useTemplate(mode === 'edit' && user?.role === 'CHEFE' ? id : undefined);
  const routineId = mode === 'create' ? identifier(params.routineId) : query.data?.routineId; const routine = useRoutine(user?.role === 'CHEFE' ? routineId : undefined); const router = useRouter();
  if (user?.role !== 'CHEFE') return <EmptyState message={strings.checklists.forbidden} />;
  if (mode === 'edit' && !id || mode === 'create' && !routineId) return <EmptyState message={strings.checklists.notFound} />;
  if (query.isError || routine.isError) return <ErrorState retry={() => { if (mode === 'edit' && id) void query.refetch(); if (routineId) void routine.refetch(); }} />;
  if (mode === 'edit' && query.isPending || routine.isPending) return <LoadingState />;
  if (query.data?.isArchived || routine.data?.isArchived) return <EmptyState message={strings.checklists.archivedError} />;
  if (!routine.data) return <EmptyState message={strings.checklists.notFound} />;
  return <ChecklistForm key={id ?? routineId} routine={routine.data} template={mode === 'edit' ? query.data : undefined} onSaved={(saved) => router.replace({ pathname: '/checklist/[id]', params: { id: saved.id } })}
    onCancel={() => { if (id) router.replace({ pathname: '/checklist/[id]', params: { id } }); else router.replace({ pathname: '/rotina/[id]', params: { id: routine.data.id } }); }} />;
}
