import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskPrioritySchema, type Task } from '@gabinete-plus/shared';
import { Button } from '../../components/button';
import { TextField } from '../../components/text-field';
import { strings } from '../../lib/strings';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { Choice } from '../routines/choice';
import { taskError, useTasksApi } from './hooks';
import { initialTaskValues, taskChanges, taskFormSchema, taskPayload, type TaskFormValues } from './model';
import { ResourcePicker } from './picker';
import type { ResourceKind, ResourceOption } from './api';
import { styles } from './styles';
export function TaskForm({ task, onSaved, onCancel }: { task?: Task; onSaved: (task: Task) => void; onCancel: () => void }) {
  const [baseline] = useState(task); const [message, setMessage] = useState<string | null>(null); const [discard, setDiscard] = useState(false); const [picker, setPicker] = useState<ResourceKind | null>(null);
  const { user } = useSession(); const manager = useSessionManager(); const api = useTasksApi(); const client = useQueryClient();
  const [labels, setLabels] = useState<Record<ResourceKind, string | null>>({ person: user?.name ?? strings.tasks.personUnknown, routine: null, contact: null, run: null });
  const form = useForm<TaskFormValues>({ resolver: zodResolver(taskFormSchema), defaultValues: initialTaskValues(user?.id ?? '', baseline) }); const dirty = form.formState.isDirty;
  const assigneeId = form.watch('assigneeId'); const routineId = form.watch('routineId');
  const save = useMutation({ retry: false, mutationFn: (values: TaskFormValues) => { if (!baseline) return api.create(taskPayload(values)); const changes = taskChanges(baseline, values); return changes ? api.update(baseline.id, changes) : Promise.resolve(null); } });
  async function submit(values: TaskFormValues) {
    setMessage(null); try {
      const saved = await save.mutateAsync(values); if (!saved) { setMessage(strings.routines.noChanges); return; }
      if (manager.store.getState().status !== 'authenticated' || manager.store.getState().user?.id !== user?.id) return;
      form.reset(initialTaskValues(user?.id ?? '', saved)); client.setQueryData(['task', saved.id, user?.id], saved); void client.invalidateQueries({ queryKey: ['tasks'] }); onSaved(saved);
    } catch (error) { setMessage(error instanceof Error ? taskError(error) : strings.contacts.requestError); if (baseline) void client.invalidateQueries({ queryKey: ['task', baseline.id] }); }
  }
  function select(kind: ResourceKind, option: ResourceOption) {
    const next = { ...labels, [kind]: option.label };
    if (kind === 'person') { form.setValue('assigneeId', option.id, { shouldDirty: true }); form.setValue('checklistRunId', null, { shouldDirty: true }); next.run = null; }
    if (kind === 'routine') { form.setValue('routineId', option.id, { shouldDirty: true }); form.setValue('checklistRunId', null, { shouldDirty: true }); next.run = null; }
    if (kind === 'contact') form.setValue('contactId', option.id, { shouldDirty: true });
    if (kind === 'run') { form.setValue('checklistRunId', option.id, { shouldDirty: true }); if (option.routineId) { form.setValue('routineId', option.routineId, { shouldDirty: true }); next.routine = option.routineTitle ?? strings.tasks.routine; } }
    setLabels(next); setPicker(null);
  }
  function clear(kind: 'routine' | 'contact' | 'run') {
    const field = kind === 'routine' ? 'routineId' : kind === 'contact' ? 'contactId' : 'checklistRunId'; form.setValue(field, null, { shouldDirty: true });
    if (kind === 'routine') form.setValue('checklistRunId', null, { shouldDirty: true }); setLabels({ ...labels, [kind]: null, ...(kind === 'routine' ? { run: null } : {}) });
  }
  const busy = save.isPending || form.formState.isSubmitting; const fields = ['title', 'description', 'instructions', 'dueDate'] satisfies (keyof TaskFormValues)[];
  return <SafeAreaView style={styles.screen} edges={['bottom']}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <FlashList data={fields} keyExtractor={(field) => field} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => <View style={styles.section}><Controller control={form.control} name={item} render={({ field, fieldState }) => <TextField label={item === 'title' ? strings.tasks.name : strings.tasks[item]}
        value={typeof field.value === 'string' ? field.value : ''} onChangeText={field.onChange} onBlur={field.onBlur} editable={!busy} multiline={item === 'description' || item === 'instructions'} placeholder={item === 'dueDate' ? strings.routines.datePlaceholder : undefined}
        errorText={fieldState.error ? strings.tasks.validation[item] : undefined} />} /></View>}
      ListFooterComponent={<View style={styles.section}><Text style={styles.label}>{strings.tasks.priority}</Text><Controller control={form.control} name="priority" render={({ field }) => <View style={styles.choices}>{taskPrioritySchema.options.map((value) => <Choice key={value} label={strings.dashboard.priority[value]} selected={field.value === value} disabled={busy} onPress={() => field.onChange(value)} />)}</View>} />
        {baseline ? <Text>{strings.tasks.linksFixed}</Text> : <><Text>{strings.tasks.inheritance}</Text><Text style={styles.label}>{strings.tasks.assignee}</Text><Text>{labels.person}</Text>
          {user?.role === 'CHEFE' && <Button label={strings.tasks.selectPerson} secondary disabled={busy} onPress={() => setPicker('person')} />}
          {!!user && assigneeId !== user.id && <Button label={strings.tasks.self} secondary disabled={busy} onPress={() => select('person', { id: user.id, label: user.name })} />}
          {(['routine', 'contact', 'run'] satisfies ('routine' | 'contact' | 'run')[]).map((kind) => <View key={kind} style={styles.section}><Text style={styles.label}>{strings.tasks[kind]}</Text><Text>{labels[kind] ?? strings.tasks.noLink}</Text>
            <Button label={kind === 'routine' ? strings.tasks.selectRoutine : kind === 'contact' ? strings.tasks.selectContact : strings.tasks.selectRun} secondary disabled={busy} onPress={() => setPicker(kind)} />
            {!!labels[kind] && <Button label={strings.tasks.clearLink} secondary disabled={busy} onPress={() => clear(kind)} />}</View>)}</>}
        {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
        <Button label={strings.routines.save} loading={busy} disabled={!!baseline && !dirty} onPress={() => void form.handleSubmit(submit)()} />
        <Button label={strings.routines.cancel} secondary disabled={busy} onPress={() => { if (dirty) setDiscard(true); else onCancel(); }} />
        {discard && <><Text>{strings.routines.unsavedTitle}</Text><Button label={strings.routines.discard} onPress={onCancel} /><Button label={strings.routines.continueEditing} secondary onPress={() => setDiscard(false)} /></>}
      </View>} />
    {!!picker && <ResourcePicker kind={picker} assigneeId={assigneeId} routineId={routineId} onSelect={(option) => select(picker, option)} onClose={() => setPicker(null)} />}
  </KeyboardAvoidingView></SafeAreaView>;
}
