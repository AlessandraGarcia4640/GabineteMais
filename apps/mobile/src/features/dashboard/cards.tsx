import { StyleSheet, Text } from 'react-native';
import type { Routine, Task } from '@gabinete-plus/shared';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
import { Card } from '../../components/card';
import { displayDate } from './model';
export function TaskCard({ task, onPress }: { task: Task; onPress?: () => void }) {
  const content = <><Text style={styles.title}>{task.title}</Text>
    <Text style={styles.description}>{strings.dashboard.status[task.status]} · {strings.dashboard.priority[task.priority]}</Text>
    <Text style={task.isOverdue ? styles.overdue : styles.description}>{task.dueDate ? `${strings.dashboard.dueDate}: ${displayDate(task.dueDate)}` : strings.dashboard.noDueDate}</Text>
    {task.isOverdue && <Text style={styles.overdue}>{strings.dashboard.overdue}</Text>}
  </>; return onPress ? <Card label={task.title} onPress={onPress}>{content}</Card> : <Card>{content}</Card>;
}
export function RoutineCard({ routine, onPress }: { routine: Routine; onPress?: () => void }) {
  const content = <><Text style={styles.title}>{routine.title}</Text>
    <Text style={styles.description}>{routine.category} · {strings.dashboard.frequency[routine.frequency]}</Text>
    {!!routine.description && <Text numberOfLines={3} style={styles.description}>{routine.description}</Text>}
    {!!routine.instructions && <Text numberOfLines={4} style={styles.description}>{routine.instructions}</Text>}
  </>; return onPress ? <Card label={routine.title} onPress={onPress}>{content}</Card> : <Card>{content}</Card>;
}
const styles = StyleSheet.create({ title: { color: theme.text, fontSize: 17, fontWeight: '600' }, description: { color: theme.muted, fontSize: 14, lineHeight: 21 }, overdue: { color: theme.danger, fontSize: 14, fontWeight: '600' } });
