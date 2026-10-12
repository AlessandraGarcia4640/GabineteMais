import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/screen';
import { FlashList } from '@shopify/flash-list';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { routineFrequencySchema, userPositionSchema, type Routine } from '@gabinete-plus/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/button';
import { TextField } from '../../components/text-field';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
import { Choice } from '../../components/choice';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { initialValues, routineChanges, routineFormSchema, toRoutinePayload, type RoutineFormValues } from './form-model';
import { routineError, useRoutinesApi } from './hooks';
export function RoutineForm({ routine, onSaved, onCancel }: { routine?: Routine; onSaved: (routine: Routine) => void; onCancel: () => void }) {
  const [baseline] = useState(routine); const [message, setMessage] = useState<string | null>(null); const [discard, setDiscard] = useState(false);
  const api = useRoutinesApi(); const client = useQueryClient(); const { user } = useSession(); const manager = useSessionManager();
  const form = useForm<RoutineFormValues>({ resolver: zodResolver(routineFormSchema), defaultValues: initialValues(baseline) });
  const dirty = form.formState.isDirty;
  const steps = useFieldArray({ control: form.control, name: 'steps' });
  const save = useMutation({ retry: false, mutationFn: async (values: RoutineFormValues) => {
    const payload = toRoutinePayload(values);
    if (!baseline) return api.create(payload);
    const changes = routineChanges(baseline, payload); return changes ? api.update(baseline.id, changes) : null;
  } });
  async function submit(values: RoutineFormValues): Promise<void> {
    setMessage(null);
    try {
      const saved = await save.mutateAsync(values);
      if (!saved) { setMessage(strings.routines.noChanges); return; }
      if (manager.store.getState().user?.id !== user?.id || manager.store.getState().status !== 'authenticated') return;
      form.reset(initialValues(saved));
      client.setQueryData(['routine', saved.id, user?.id], saved);
      void Promise.all([client.invalidateQueries({ queryKey: ['routines'] }), client.invalidateQueries({ queryKey: ['routine', saved.id] })]);
      onSaved(saved);
    } catch (error) {
      setMessage(error instanceof Error ? routineError(error) : strings.routines.requestError);
      void client.invalidateQueries({ queryKey: ['routine', baseline?.id] });
    }
  }
  const busy = save.isPending || form.formState.isSubmitting;
  const textFields = ['title', 'category', 'description', 'instructions', 'frequencyDetails', 'specificDate'] satisfies (keyof RoutineFormValues)[];
  const header = <View style={styles.header}>
    {textFields.map((name) => <Controller key={name} control={form.control} name={name} render={({ field, fieldState }) => <TextField
      label={name === 'title' ? strings.routines.name : strings.routines[name]} value={typeof field.value === 'string' ? field.value : ''} onChangeText={field.onChange} onBlur={field.onBlur}
      editable={!busy} multiline={['description', 'instructions', 'frequencyDetails'].includes(name)}
      placeholder={name === 'specificDate' ? strings.routines.datePlaceholder : undefined} errorText={fieldState.error ? strings.routines.validation[name] : undefined} />} />)}
    <Text style={styles.label}>{strings.routines.frequency}</Text><Controller control={form.control} name="frequency" render={({ field }) => <View style={styles.choices}>
      {routineFrequencySchema.options.map((frequency) => <Choice key={frequency} label={strings.dashboard.frequency[frequency]} selected={field.value === frequency} disabled={busy} onPress={() => field.onChange(frequency)} />)}</View>} />
    <Text style={styles.label}>{strings.routines.defaultPosition}</Text><Controller control={form.control} name="defaultPosition" render={({ field }) => <View style={styles.choices}>
      <Choice label={strings.routines.noPosition} selected={field.value === ''} disabled={busy} onPress={() => field.onChange('')} />
      {userPositionSchema.options.map((position) => <Choice key={position} label={strings.routines.positions[position]} selected={field.value === position} disabled={busy} onPress={() => field.onChange(position)} />)}</View>} />
    <Text style={styles.label}>{strings.routines.essential}</Text><Controller control={form.control} name="essentialForTransition" render={({ field }) => <View style={styles.choices}>
      <Choice label={strings.routines.yes} selected={field.value} disabled={busy} onPress={() => field.onChange(true)} />
      <Choice label={strings.routines.no} selected={!field.value} disabled={busy} onPress={() => field.onChange(false)} /></View>} />
    <Text style={styles.label}>{strings.routines.steps}</Text>
  </View>;
  const footer = <View style={styles.footer}>
    <Button label={strings.routines.addStep} secondary disabled={busy || steps.fields.length >= 100} onPress={() => steps.append({ text: '' })} />
    {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
    <Button label={busy ? strings.routines.saving : strings.routines.save} loading={busy} disabled={!!baseline && !dirty} onPress={() => void form.handleSubmit(submit)()} />
    <Button label={strings.routines.cancel} secondary disabled={busy} onPress={() => { if (dirty) setDiscard(true); else onCancel(); }} />
    {discard && <View style={styles.footer}><Text style={styles.label}>{strings.routines.unsavedTitle}</Text><Text>{strings.routines.unsavedDescription}</Text>
      <Button label={strings.routines.discard} onPress={onCancel} /><Button label={strings.routines.continueEditing} secondary onPress={() => setDiscard(false)} /></View>}
  </View>;
  return <Screen keyboard>
    <FlashList data={steps.fields} keyExtractor={(field) => field.id} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{strings.routines.noSteps}</Text>} ListFooterComponent={footer} renderItem={({ index }) => <View style={styles.step}>
        <Controller control={form.control} name={`steps.${index}.text`} render={({ field, fieldState }) => <TextField label={strings.routines.step(index)} value={field.value} multiline
          onChangeText={field.onChange} onBlur={field.onBlur} editable={!busy} errorText={fieldState.error ? strings.routines.validation.steps : undefined} />} />
        <Button label={strings.routines.moveUp(index)} secondary disabled={busy || index === 0} onPress={() => steps.move(index, index - 1)} />
        <Button label={strings.routines.moveDown(index)} secondary disabled={busy || index === steps.fields.length - 1} onPress={() => steps.move(index, index + 1)} />
        <Button label={strings.routines.removeStep(index)} secondary disabled={busy} onPress={() => steps.remove(index)} />
      </View>} />
  </Screen>;
}
const styles = StyleSheet.create({ content: { padding: 20 }, header: { gap: 16, paddingBottom: 20 },
  label: { color: theme.text, fontWeight: '600', fontSize: 16 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: { gap: 10, marginBottom: 20 }, footer: { gap: 16, paddingVertical: 20 }, error: { color: theme.danger, fontSize: 14 }, empty: { color: theme.muted } });
