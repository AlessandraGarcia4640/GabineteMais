import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { routineFrequencySchema, userIdParamsSchema, type Routine } from '@gabinete-plus/shared';
import { useSession } from '../../providers/session-provider';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
import { Button } from '../../components/button';
import { TextField } from '../../components/text-field';
import { EmptyState, ErrorState, LoadingState, RoutineCard } from '../dashboard/cards';
import { displayDate } from '../dashboard/model';
import { useGabineteDate } from '../dashboard/hooks';
import { routineError, useRoutine, useRoutineList, useRoutinesApi } from './hooks';
import { Choice } from './choice';
import { RoutineForm } from './form';
export function RoutineListScreen() {
  const params = useLocalSearchParams(); const router = useRouter(); const { user } = useSession(); const day = useGabineteDate();
  const [mode, setMode] = useState<'all' | 'today' | 'archived'>(params.scope === 'today' ? 'today' : 'all');
  const [input, setInput] = useState(''); const [q, setQ] = useState(''); const [frequency, setFrequency] = useState<Routine['frequency'] | ''>('');
  const query = useRoutineList(mode, day, q, frequency);
  const data = useMemo(() => [...new Map((query.data?.pages.flatMap((page) => page.items) ?? []).map((routine) => [routine.id, routine])).values()], [query.data]);
  const header = <View style={styles.header}>
    {user?.role === 'CHEFE' && <Button label={strings.routines.create} onPress={() => router.push('/rotina/nova')} />}
    <TextField label={strings.routines.search} value={input} onChangeText={setInput} maxLength={100} returnKeyType="search" onSubmitEditing={() => setQ(input.trim())} />
    <Button label={strings.routines.searchAction} secondary onPress={() => setQ(input.trim())} />
    <View style={styles.choices}>{(['all', 'today', 'archived'] satisfies ('all' | 'today' | 'archived')[]).map((value) => <Choice key={value} label={strings.routines[value]} selected={mode === value} onPress={() => setMode(value)} />)}</View>
    <View style={styles.choices}><Choice label={strings.routines.allFrequencies} selected={frequency === ''} onPress={() => setFrequency('')} />
      {routineFrequencySchema.options.map((value) => <Choice key={value} label={strings.dashboard.frequency[value]} selected={frequency === value} onPress={() => setFrequency(value)} />)}</View>
  </View>;
  return <SafeAreaView style={styles.screen} edges={['bottom']}>
    {query.isPending ? <View>{header}<LoadingState /></View> : query.isError && !query.data ? <View>{header}<ErrorState retry={() => void query.refetch()} /></View> : <FlashList data={data} keyExtractor={(routine) => routine.id} contentContainerStyle={styles.content}
      ListHeaderComponent={header} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => router.push({ pathname: '/rotina/[id]', params: { id: item.id } })}><RoutineCard routine={item} /></Pressable>}
      refreshing={query.isRefetching} onRefresh={() => void query.refetch()} ListEmptyComponent={query.isError ? null : <EmptyState message={strings.routines.empty} />}
      ListFooterComponent={<View style={styles.footer}>{query.isError && <ErrorState updating retry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch(); }} />}
        {query.hasNextPage && <Button label={query.isFetchingNextPage ? strings.dashboard.loadingMore : strings.dashboard.loadMore} loading={query.isFetchingNextPage} disabled={query.isRefetching} onPress={() => void query.fetchNextPage()} />}</View>} />}
  </SafeAreaView>;
}
export function RoutineDetailScreen() {
  const params = useLocalSearchParams(); const valid = userIdParamsSchema.safeParse({ id: params.id }); const id = valid.success ? valid.data.id : undefined;
  const query = useRoutine(id); const { user } = useSession(); const api = useRoutinesApi(); const router = useRouter(); const client = useQueryClient();
  const [confirm, setConfirm] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const archive = useMutation({ retry: false, mutationFn: () => api.archive(id ?? ''), onSuccess: async () => {
    setConfirm(false); await Promise.all([client.invalidateQueries({ queryKey: ['routines'] }), client.invalidateQueries({ queryKey: ['routine', id] })]);
  }, onError: (error) => { setMessage(routineError(error)); void client.invalidateQueries({ queryKey: ['routine', id] }); } });
  if (!valid.success) return <EmptyState message={strings.routines.notFound} />;
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <View><Text style={styles.error}>{routineError(query.error)}</Text><ErrorState retry={() => void query.refetch()} /></View>;
  const routine = query.data;
  const header = <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>{routine.title}</Text>
    <Text style={styles.text}>{routine.category} · {strings.dashboard.frequency[routine.frequency]}</Text>
    {routine.isArchived && <Text style={styles.error}>{strings.routines.archivedLabel}</Text>}
    <Text style={styles.label}>{strings.routines.description}</Text><Text style={styles.text}>{routine.description}</Text>
    <Text style={styles.label}>{strings.routines.instructions}</Text><Text style={styles.text}>{routine.instructions}</Text>
    <Text style={styles.label}>{strings.routines.frequencyDetails}</Text><Text style={styles.text}>{routine.frequencyDetails}</Text>
    {routine.specificDate && <Text style={styles.text}>{strings.routines.specificDate}: {displayDate(routine.specificDate)}</Text>}
    <Text style={styles.text}>{strings.routines.defaultPosition}: {routine.defaultPosition ? strings.routines.positions[routine.defaultPosition] : strings.routines.noPosition}</Text>
    <Text style={styles.text}>{strings.routines.essential}: {routine.essentialForTransition ? strings.routines.yes : strings.routines.no}</Text>
    <Button label={strings.checklists.models} secondary onPress={() => router.push({ pathname: '/checklists', params: { routineId: routine.id } })} />
    {user?.role === 'CHEFE' && !routine.isArchived && <Button label={strings.checklists.create} onPress={() => router.push({ pathname: '/checklist/nova', params: { routineId: routine.id } })} />}
    <Text style={styles.label}>{strings.routines.steps}</Text></View>;
  return <SafeAreaView style={styles.screen} edges={['bottom']}><FlashList data={routine.steps.map((text, index) => ({ text, index }))} keyExtractor={(step) => String(step.index)} contentContainerStyle={styles.content}
    ListHeaderComponent={header} renderItem={({ item }) => <View style={styles.step}><Text style={styles.label}>{strings.routines.step(item.index)}</Text><Text style={styles.text}>{item.text}</Text></View>}
    ListEmptyComponent={<Text>{strings.routines.noSteps}</Text>}
    ListFooterComponent={<View style={styles.footer}>{!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
      {user?.role === 'CHEFE' && !routine.isArchived && <><Button label={strings.routines.edit} disabled={archive.isPending} onPress={() => router.push({ pathname: '/rotina/[id]/editar', params: { id: routine.id } })} />
        {!confirm ? <Button label={strings.routines.archive} secondary onPress={() => { setMessage(null); setConfirm(true); }} /> : <View style={styles.footer}>
          <Text style={styles.label}>{strings.routines.archiveTitle}</Text><Text style={styles.text}>{strings.routines.archiveDescription}</Text>
          <Button label={archive.isPending ? strings.routines.archiving : strings.routines.confirmArchive} loading={archive.isPending} onPress={() => archive.mutate()} />
          <Button label={strings.routines.cancel} secondary disabled={archive.isPending} onPress={() => setConfirm(false)} /></View>}</>}
    </View>} /></SafeAreaView>;
}
export function RoutineFormScreen({ mode }: { mode: 'create' | 'edit' }) {
  const { user } = useSession(); const router = useRouter(); const params = useLocalSearchParams();
  const valid = userIdParamsSchema.safeParse({ id: params.id }); const id = mode === 'edit' && valid.success ? valid.data.id : undefined;
  const query = useRoutine(user?.role === 'CHEFE' ? id : undefined);
  if (user?.role !== 'CHEFE') return <EmptyState message={strings.routines.forbidden} />;
  if (mode === 'edit' && !valid.success) return <EmptyState message={strings.routines.notFound} />;
  if (mode === 'edit' && query.isPending) return <LoadingState />;
  if (mode === 'edit' && query.isError) return <View><Text style={styles.error}>{routineError(query.error)}</Text><ErrorState retry={() => void query.refetch()} /></View>;
  if (mode === 'edit' && query.data?.isArchived) return <EmptyState message={strings.routines.archivedError} />;
  return <RoutineForm key={id ?? 'new'} routine={mode === 'edit' ? query.data : undefined}
    onSaved={(routine) => router.replace({ pathname: '/rotina/[id]', params: { id: routine.id } })}
    onCancel={() => { if (id) router.replace({ pathname: '/rotina/[id]', params: { id } }); else router.replace('/rotinas'); }} />;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: theme.background }, content: { padding: 20 }, header: { gap: 16, paddingBottom: 20 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, title: { fontSize: 25, fontWeight: '700', color: theme.text }, label: { fontSize: 16, fontWeight: '600', color: theme.text },
  text: { fontSize: 15, lineHeight: 23, color: theme.muted }, error: { color: theme.danger, padding: 16 }, footer: { paddingVertical: 20, gap: 16 }, step: { marginBottom: 20, gap: 8 } });
