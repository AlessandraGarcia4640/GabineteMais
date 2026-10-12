import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/screen';
import { Button } from '../../components/button';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback';
import { RoutineCard, TaskCard } from './cards';
import { useDashboardQueries, useGabineteDate } from './hooks';
import { displayDate, pendingPreview } from './model';
export function DashboardScreen() {
  const { user } = useSession(); const manager = useSessionManager(); const router = useRouter(); const day = useGabineteDate();
  const { open, progress, routines } = useDashboardQueries(day);
  const logout = useMutation({ mutationFn: () => manager.logout(), retry: false });
  const retryTasks = () => { void open.refetch(); void progress.refetch(); };
  const refresh = () => { retryTasks(); void routines.refetch(); };
  const tasks = pendingPreview(open.data?.items ?? [], progress.data?.items ?? [], user?.id ?? '');
  const hasMoreTasks = !!open.data?.nextCursor || !!progress.data?.nextCursor || (open.data?.items.length ?? 0) + (progress.data?.items.length ?? 0) > 5;
  if (!user) return null;
  return <Screen><ScrollView contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={open.isRefetching || progress.isRefetching || routines.isRefetching} onRefresh={refresh} />}>
    <View style={styles.header}><Text style={styles.muted}>{strings.dashboard.greeting}</Text><Text accessibilityRole="header" style={styles.name}>{user.name}</Text>
      <Text style={styles.muted}>{displayDate(day)}</Text><Button label={strings.feedback.refresh} secondary onPress={refresh} /></View>
    <View style={styles.section}><Text style={styles.heading}>{strings.dashboard.shortcuts}</Text>
      <Button label={strings.dashboard.tasksShortcut} onPress={() => router.push('/tarefas')} />
      <Button label={strings.dashboard.routinesShortcut} secondary onPress={() => router.push({ pathname: '/rotinas', params: { scope: 'today' } })} />
      <Button label={strings.checklists.title} secondary onPress={() => router.push('/checklists')} />
      <Button label={strings.contacts.title} secondary onPress={() => router.push('/contatos')} />
      <Button label={strings.guidelines.title} secondary onPress={() => router.push('/orientacoes')} />
      <Button label={strings.transition.title} secondary onPress={() => router.push('/transicao')} />
      <Button label={strings.dashboard.profileShortcut} secondary onPress={() => router.push('/perfil')} /></View>
    <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{strings.dashboard.tasksTitle}</Text><Text style={styles.muted}>{strings.dashboard.tasksDescription}</Text>
      {open.isPending || progress.isPending ? <LoadingState /> : open.isError || progress.isError ? <ErrorState retry={retryTasks} /> : tasks.length === 0 ? <EmptyState message={strings.dashboard.emptyTasks} /> : tasks.map((task) => <TaskCard key={task.id} task={task} onPress={() => router.push({ pathname: '/tarefa/[id]', params: { id: task.id } })} />)}
      {hasMoreTasks && !open.isError && !progress.isError && <Text style={styles.muted}>{strings.dashboard.moreTasks}</Text>}
      <Button label={strings.dashboard.viewTasks} secondary onPress={() => router.push('/tarefas')} /></View>
    <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{strings.dashboard.routinesTitle}</Text><Text style={styles.muted}>{strings.dashboard.routinesDescription}</Text>
      {routines.isPending ? <LoadingState /> : routines.isError ? <ErrorState retry={() => void routines.refetch()} /> : !routines.data.items.length ? <EmptyState message={strings.dashboard.emptyRoutines} /> : routines.data.items.map((routine) => <RoutineCard key={routine.id} routine={routine} />)}
      {!!routines.data?.nextCursor && !routines.isError && <Text style={styles.muted}>{strings.dashboard.moreRoutines}</Text>}
      <Button label={strings.dashboard.viewRoutines} secondary onPress={() => router.push({ pathname: '/rotinas', params: { scope: 'today' } })} /></View>
    <Button label={logout.isPending ? strings.session.leaving : strings.session.logout} secondary loading={logout.isPending} onPress={() => logout.mutate()} />
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: 20, gap: 24, maxWidth: 700, width: '100%', alignSelf: 'center' },
  header: { gap: 10 }, name: { color: theme.text, fontSize: 27, fontWeight: '700' }, heading: { color: theme.text, fontSize: 21, fontWeight: '700' },
  muted: { color: theme.muted, fontSize: 14, lineHeight: 21 }, section: { gap: 12 } });
