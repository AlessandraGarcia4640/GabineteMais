import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../../components/screen';
import { FlashList } from '@shopify/flash-list';
import { Button } from '../../components/button';
import { strings } from '../../lib/strings';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback';
import { RoutineCard, TaskCard } from './cards';
import { useGabineteDate, usePendingTasks, useTodayRoutines } from './hooks';
export function PendingTasksScreen() {
  const [status, setStatus] = useState<'ABERTA' | 'EM_ANDAMENTO'>('ABERTA'); const day = useGabineteDate(); const query = usePendingTasks(status, day);
  const data = useMemo(() => [...new Map((query.data?.pages.flatMap((page) => page.items) ?? []).map((task) => [task.id, task])).values()], [query.data]);
  return <Screen><View style={styles.filters}>
    <Button label={strings.dashboard.open} secondary={status !== 'ABERTA'} onPress={() => setStatus('ABERTA')} />
    <Button label={strings.dashboard.progress} secondary={status !== 'EM_ANDAMENTO'} onPress={() => setStatus('EM_ANDAMENTO')} /></View>
    {query.isPending ? <LoadingState /> : query.isError && !query.data ? <ErrorState retry={() => void query.refetch()} /> : <FlashList data={data} keyExtractor={(task) => task.id}
      contentContainerStyle={styles.list} renderItem={({ item }) => <TaskCard task={item} />} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
      ListEmptyComponent={query.isError ? null : <EmptyState message={strings.dashboard.emptyStatus} />}
      ListFooterComponent={<View style={styles.footer}>{query.isError && <ErrorState updating retry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch(); }} />}
        {query.hasNextPage && <Button label={query.isFetchingNextPage ? strings.feedback.loadingMore : strings.feedback.loadMore} loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />}</View>} />}
  </Screen>;
}
export function TodayRoutinesScreen() {
  const day = useGabineteDate(); const query = useTodayRoutines(day);
  const data = useMemo(() => [...new Map((query.data?.pages.flatMap((page) => page.items) ?? []).map((routine) => [routine.id, routine])).values()], [query.data]);
  return <Screen>
    {query.isPending ? <LoadingState /> : query.isError && !query.data ? <ErrorState retry={() => void query.refetch()} /> : <FlashList data={data} keyExtractor={(routine) => routine.id}
      contentContainerStyle={styles.list} renderItem={({ item }) => <RoutineCard routine={item} />} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
      ListEmptyComponent={query.isError ? null : <EmptyState message={strings.dashboard.emptyRoutines} />}
      ListFooterComponent={<View style={styles.footer}>{query.isError && <ErrorState updating retry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch(); }} />}
        {query.hasNextPage && <Button label={query.isFetchingNextPage ? strings.feedback.loadingMore : strings.feedback.loadMore} loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />}</View>} />}
  </Screen>;
}
const styles = StyleSheet.create({ list: { padding: 20 }, filters: { padding: 20, gap: 10 }, footer: { paddingVertical: 16 } });
