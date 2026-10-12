import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Routine, Task } from '@gabinete-plus/shared';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
import { Button } from '../../components/button';
import { displayDate } from './model';
export function TaskCard({ task }: { task: Task }) {
  return <View style={styles.card}><Text style={styles.title}>{task.title}</Text>
    <Text style={styles.description}>{strings.dashboard.status[task.status]} · {strings.dashboard.priority[task.priority]}</Text>
    <Text style={task.isOverdue ? styles.overdue : styles.description}>{task.dueDate ? `${strings.dashboard.dueDate}: ${displayDate(task.dueDate)}` : strings.dashboard.noDueDate}</Text>
    {task.isOverdue && <Text style={styles.overdue}>{strings.dashboard.overdue}</Text>}
  </View>;
}
export function RoutineCard({ routine }: { routine: Routine }) {
  return <View style={styles.card}><Text style={styles.title}>{routine.title}</Text>
    <Text style={styles.description}>{routine.category} · {strings.dashboard.frequency[routine.frequency]}</Text>
    {!!routine.description && <Text numberOfLines={3} style={styles.description}>{routine.description}</Text>}
    {!!routine.instructions && <Text numberOfLines={4} style={styles.description}>{routine.instructions}</Text>}
  </View>;
}
export function LoadingState() { return <View style={styles.state}><ActivityIndicator color={theme.primary} /><Text style={styles.description}>{strings.dashboard.loading}</Text></View>; }
export function EmptyState({ message }: { message: string }) { return <View style={styles.state}><Text style={styles.description}>{message}</Text></View>; }
export function ErrorState({ retry, updating = false }: { retry: () => void; updating?: boolean }) {
  return <View style={styles.state}><Text accessibilityRole="alert" style={styles.overdue}>{updating ? strings.dashboard.updatingError : strings.dashboard.error}</Text><Button label={strings.dashboard.retry} secondary onPress={retry} /></View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, padding: 18, gap: 8, marginBottom: 12 },
  title: { color: theme.text, fontSize: 17, fontWeight: '600' }, description: { color: theme.muted, fontSize: 14, lineHeight: 21 }, overdue: { color: theme.danger, fontSize: 14, fontWeight: '600' },
  state: { padding: 20, gap: 16, alignItems: 'center' } });
