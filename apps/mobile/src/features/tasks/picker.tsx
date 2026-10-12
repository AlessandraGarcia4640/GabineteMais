import { Modal, Text, View } from 'react-native';
import { Card } from '../../components/card';
import { Screen } from '../../components/screen';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSession } from '../../providers/session-provider';
import { Button } from '../../components/button';
import { strings } from '../../lib/strings';
import { LoadingState, ErrorState, EmptyState } from '../../components/feedback';
import { useTasksApi } from './hooks';
import type { ResourceKind, ResourceOption } from './api';
import { styles } from './styles';
const labels: Record<ResourceKind, string> = { person: strings.tasks.selectPerson, routine: strings.tasks.selectRoutine, contact: strings.tasks.selectContact, run: strings.tasks.selectRun };
export function ResourcePicker({ kind, assigneeId, routineId, onSelect, onClose }: { kind: ResourceKind; assigneeId: string; routineId: string | null; onSelect: (option: ResourceOption) => void; onClose: () => void }) {
  const api = useTasksApi(); const { user } = useSession(); const query = useInfiniteQuery({ queryKey: ['task-choices', kind, user?.id, assigneeId, routineId], enabled: !!user, retry: false, initialPageParam: '',
    queryFn: ({ pageParam, signal }) => api.choices(kind, pageParam, assigneeId, routineId, signal), getNextPageParam: (page) => page.nextCursor || undefined });
  const data = [...new Map((query.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [item.id, item])).values()];
  return <Modal visible animationType="slide" onRequestClose={onClose}><Screen edges={['top', 'bottom', 'left', 'right']}><View style={styles.content}><Text accessibilityRole="header" style={styles.title}>{labels[kind]}</Text><Button label={strings.routines.cancel} secondary onPress={onClose} /></View>
    {query.isPending ? <LoadingState /> : query.isError && !query.data ? <ErrorState retry={() => void query.refetch()} /> : <FlashList data={data} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
      renderItem={({ item }) => <Card label={item.label} onPress={() => onSelect(item)}><Text style={styles.label}>{item.label}</Text></Card>}
      ListEmptyComponent={<EmptyState message={strings.tasks.selectionEmpty} />} ListFooterComponent={<View style={styles.section}>
        {query.isError && <ErrorState updating retry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch(); }} />}
        {query.hasNextPage && <Button label={strings.feedback.loadMore} loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />}</View>} />}
  </Screen></Modal>;
}
