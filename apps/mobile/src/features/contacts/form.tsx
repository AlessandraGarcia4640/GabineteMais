import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Contact } from '@gabinete-plus/shared';
import { Button } from '../../components/button';
import { TextField } from '../../components/text-field';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
import { Choice } from '../routines/choice';
import { useSession, useSessionManager } from '../../providers/session-provider';
import { contactChanges, contactFormSchema, contactPayload, initialContactValues, type ContactFormValues } from './model';
import { contactError, useContactsApi } from './hooks';
interface Entry { id: string; kind: 'phones' | 'tags'; index: number }
export function ContactForm({ contact, onSaved, onCancel }: { contact?: Contact; onSaved: (contact: Contact) => void; onCancel: () => void }) {
  const [baseline] = useState(contact); const [message, setMessage] = useState<string | null>(null); const [discard, setDiscard] = useState(false);
  const api = useContactsApi(); const client = useQueryClient(); const { user } = useSession(); const manager = useSessionManager();
  const form = useForm<ContactFormValues>({ resolver: zodResolver(contactFormSchema), defaultValues: initialContactValues(baseline) }); const dirty = form.formState.isDirty;
  const phones = useFieldArray({ control: form.control, name: 'phones' }); const tags = useFieldArray({ control: form.control, name: 'tags' });
  const entries: Entry[] = [...phones.fields.map((field, index): Entry => ({ id: field.id, kind: 'phones', index })), ...tags.fields.map((field, index): Entry => ({ id: field.id, kind: 'tags', index }))];
  const save = useMutation({ retry: false, mutationFn: (values: ContactFormValues) => {
    const payload = contactPayload(values); if (!baseline) return api.create(payload); const changes = contactChanges(baseline, payload); return changes ? api.update(baseline.id, changes) : Promise.resolve(null);
  } });
  async function submit(values: ContactFormValues) {
    setMessage(null);
    try {
      const saved = await save.mutateAsync(values); if (!saved) { setMessage(strings.routines.noChanges); return; }
      if (manager.store.getState().user?.id !== user?.id || manager.store.getState().status !== 'authenticated') return;
      form.reset(initialContactValues(saved)); client.setQueryData(['contact', saved.id, user?.id], saved); void client.invalidateQueries({ queryKey: ['contacts'] }); onSaved(saved);
    } catch (error) { setMessage(error instanceof Error ? contactError(error) : strings.contacts.requestError); }
  }
  const busy = save.isPending || form.formState.isSubmitting; const textFields = ['name', 'organization', 'jobTitle', 'email', 'notes'] satisfies (keyof ContactFormValues)[];
  return <SafeAreaView style={styles.screen} edges={['bottom']}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <FlashList data={entries} keyExtractor={(entry) => `${entry.kind}:${entry.id}`} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View style={styles.section}>{textFields.map((name) => <Controller key={name} control={form.control} name={name} render={({ field, fieldState }) => <TextField
        label={strings.contacts[name]} value={typeof field.value === 'string' ? field.value : ''} onChangeText={field.onChange} onBlur={field.onBlur} editable={!busy} multiline={name === 'notes'}
        keyboardType={name === 'email' ? 'email-address' : 'default'} autoCapitalize={name === 'email' ? 'none' : 'sentences'} errorText={fieldState.error ? strings.contacts.validation[name] : undefined} />} />)}
        <Text style={styles.label}>{strings.contacts.keyContact}</Text><Controller control={form.control} name="isKeyContact" render={({ field }) => <View style={styles.choices}>
          <Choice label={strings.routines.yes} selected={field.value} disabled={busy} onPress={() => field.onChange(true)} /><Choice label={strings.routines.no} selected={!field.value} disabled={busy} onPress={() => field.onChange(false)} /></View>} />
      </View>}
      renderItem={({ item }) => <View style={styles.section}><Controller control={form.control} name={`${item.kind}.${item.index}.text`} render={({ field, fieldState }) => <TextField label={item.kind === 'phones' ? strings.contacts.phone(item.index) : strings.contacts.tag(item.index)}
        value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} editable={!busy} keyboardType={item.kind === 'phones' ? 'phone-pad' : 'default'} errorText={fieldState.error ? strings.contacts.validation[item.kind] : undefined} />} />
        <Button label={item.kind === 'phones' ? strings.contacts.removePhone(item.index) : strings.contacts.removeTag(item.index)} secondary disabled={busy} onPress={() => { if (item.kind === 'phones') phones.remove(item.index); else tags.remove(item.index); }} /></View>}
      ListFooterComponent={<View style={styles.section}>
        <Button label={strings.contacts.addPhone} secondary disabled={busy || phones.fields.length >= 10} onPress={() => phones.append({ text: '' })} />
        <Button label={strings.contacts.addTag} secondary disabled={busy || tags.fields.length >= 20} onPress={() => tags.append({ text: '' })} />
        {!!form.formState.errors.phones && <Text accessibilityRole="alert" style={styles.error}>{strings.contacts.validation.phones}</Text>}
        {!!form.formState.errors.tags && <Text accessibilityRole="alert" style={styles.error}>{strings.contacts.validation.tags}</Text>}
        {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
        <Button label={strings.routines.save} loading={busy} disabled={!!baseline && !dirty} onPress={() => void form.handleSubmit(submit)()} />
        <Button label={strings.routines.cancel} secondary disabled={busy} onPress={() => { if (dirty) setDiscard(true); else onCancel(); }} />
        {discard && <><Text>{strings.routines.unsavedTitle}</Text><Text>{strings.routines.unsavedDescription}</Text><Button label={strings.routines.discard} onPress={onCancel} /><Button label={strings.routines.continueEditing} secondary onPress={() => setDiscard(false)} /></>}
      </View>} />
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: theme.background }, content: { padding: 20 }, section: { gap: 12, paddingBottom: 20 }, label: { color: theme.text, fontSize: 16, fontWeight: '600' }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, error: { color: theme.danger } });
