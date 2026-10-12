import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Button } from '../../components/button';
import { theme } from '../../lib/theme';
import { strings } from '../../lib/strings';
import { EmptyState, ErrorState, LoadingState, RoutineCard, TaskCard } from './cards';
import { useGabineteDate, usePendingTasks, useTodayRoutines } from './hooks';
export function PendingTasksScreen() {
  const [status, setStatus] = useState<'ABERTA' | 'EM_ANDAMENTO'>('ABERTA'); const day = useGabineteDate(); const query = usePendingTasks(status, day);
  const data = useMemo(() => [...new Map((query.data?.pages.flatMap((page) => page.items) ?? []).map((task) => [task.id, task])).values()], [query.data]);
  return <SafeAreaView style={styles.screen} edges={['bottom']}><View style={styles.filters}>
    <Button label={strings.dashboard.open} secondary={status !== 'ABERTA'} onPress={() => setStatus('ABERTA')} />
    <Button label={strings.dashboard.progress} secondary={status !== 'EM_ANDAMENTO'} onPress={() => setStatus('EM_ANDAMENTO')} /></View>
    {query.isPending ? <LoadingState /> : query.isError && !query.data ? <ErrorState retry={() => void query.refetch()} /> : <FlashList data={data} keyExtractor={(task) => task.id}
      contentContainerStyle={styles.list} renderItem={({ item }) => <TaskCard task={item} />} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
      ListEmptyComponent={query.isError ? null : <EmptyState message={strings.dashboard.emptyStatus} />}
      ListFooterComponent={<View style={styles.footer}>{query.isError && <ErrorState updating retry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch(); }} />}
        {query.hasNextPage && <Button label={query.isFetchingNextPage ? strings.dashboard.loadingMore : strings.dashboard.loadMore} loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />}</View>} />}
  </SafeAreaView>;
}
export function TodayRoutinesScreen() {
  const day = useGabineteDate(); const query = useTodayRoutines(day);
  const data = useMemo(() => [...new Map((query.data?.pages.flatMap((page) => page.items) ?? []).map((routine) => [routine.id, routine])).values()], [query.data]);
  return <SafeAreaView style={styles.screen} edges={['bottom']}>
    {query.isPending ? <LoadingState /> : query.isError && !query.data ? <ErrorState retry={() => void query.refetch()} /> : <FlashList data={data} keyExtractor={(routine) => routine.id}
      contentContainerStyle={styles.list} renderItem={({ item }) => <RoutineCard routine={item} />} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
      ListEmptyComponent={query.isError ? null : <EmptyState message={strings.dashboard.emptyRoutines} />}
      ListFooterComponent={<View style={styles.footer}>{query.isError && <ErrorState updating retry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch(); }} />}
        {query.hasNextPage && <Button label={query.isFetchingNextPage ? strings.dashboard.loadingMore : strings.dashboard.loadMore} loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />}</View>} />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: theme.background }, list: { padding: 20 }, filters: { padding: 20, gap: 10 }, footer: { paddingVertical: 16 } });
