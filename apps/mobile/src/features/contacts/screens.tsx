import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../components/card';
import { Screen } from '../../components/screen';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userIdParamsSchema } from '@gabinete-plus/shared';
import { Button } from '../../components/button';
import { TextField } from '../../components/text-field';
import { strings } from '../../lib/strings';
import { theme } from '../../lib/theme';
import { useSession } from '../../providers/session-provider';
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback';
import { Choice } from '../../components/choice';
import { contactError, useContact, useContacts, useContactsApi } from './hooks';
import { ContactForm } from './form';
export function ContactListScreen() {
  const router = useRouter(); const { user } = useSession(); const [archived, setArchived] = useState(false); const [keyOnly, setKeyOnly] = useState(false);
  const [input, setInput] = useState({ q: '', organization: '', tag: '' }); const [search, setSearch] = useState(input); const query = useContacts({ ...search, archived, keyOnly });
  const data = useMemo(() => [...new Map((query.data?.pages.flatMap((page) => page.items) ?? []).map((contact) => [contact.id, contact])).values()], [query.data]);
  const header = <View style={styles.section}>{user?.role === 'CHEFE' && <Button label={strings.contacts.create} onPress={() => router.push('/contato/novo')} />}
    <TextField label={strings.contacts.search} value={input.q} onChangeText={(q) => setInput({ ...input, q })} maxLength={100} />
    <TextField label={strings.contacts.filterOrganization} value={input.organization} onChangeText={(organization) => setInput({ ...input, organization })} maxLength={200} />
    <TextField label={strings.contacts.filterTag} value={input.tag} onChangeText={(tag) => setInput({ ...input, tag })} maxLength={40} />
    <Button label={strings.contacts.applyFilters} secondary onPress={() => setSearch({ q: input.q.trim(), organization: input.organization.trim(), tag: input.tag.trim() })} />
    <Button label={strings.contacts.clearFilters} secondary onPress={() => { const cleared = { q: '', organization: '', tag: '' }; setInput(cleared); setSearch(cleared); setArchived(false); setKeyOnly(false); }} />
    <View style={styles.choices}><Choice label={strings.contacts.active} selected={!archived} onPress={() => setArchived(false)} /><Choice label={strings.contacts.archived} selected={archived} onPress={() => setArchived(true)} /></View>
    <View style={styles.choices}><Choice label={strings.contacts.all} selected={!keyOnly} onPress={() => setKeyOnly(false)} /><Choice label={strings.contacts.keyOnly} selected={keyOnly} onPress={() => setKeyOnly(true)} /></View></View>;
  return <Screen>{query.isPending ? <View>{header}<LoadingState /></View> : query.isError && !query.data ? <View>{header}<ErrorState retry={() => void query.refetch()} /></View> :
    <FlashList data={data} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} ListHeaderComponent={header} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
      renderItem={({ item }) => <Card label={item.name} onPress={() => router.push({ pathname: '/contato/[id]', params: { id: item.id } })}>
        <Text style={styles.label}>{item.name}</Text><Text style={styles.text}>{item.organization}</Text>{!!item.jobTitle && <Text style={styles.text}>{item.jobTitle}</Text>}{item.isKeyContact && <Text>{strings.contacts.keyContact}</Text>}{!!item.tags.length && <Text style={styles.text}>{item.tags.join(' · ')}</Text>}</Card>}
      ListEmptyComponent={query.isError ? null : <EmptyState message={strings.contacts.empty} />}
      ListFooterComponent={<View style={styles.section}>{query.isError && <ErrorState updating retry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch(); }} />}
        {query.hasNextPage && <Button label={strings.feedback.loadMore} loading={query.isFetchingNextPage} disabled={query.isRefetching} onPress={() => void query.fetchNextPage()} />}</View>} />}</Screen>;
}
export function ContactDetailScreen() {
  const params = useLocalSearchParams(); const valid = userIdParamsSchema.safeParse({ id: params.id }); const id = valid.success ? valid.data.id : undefined;
  const query = useContact(id); const { user } = useSession(); const api = useContactsApi(); const router = useRouter(); const client = useQueryClient(); const [confirm, setConfirm] = useState(false);
  const archive = useMutation({ retry: false, mutationFn: () => api.archive(id ?? ''), onSuccess: async () => {
    setConfirm(false); await Promise.all([client.invalidateQueries({ queryKey: ['contact', id] }), client.invalidateQueries({ queryKey: ['contacts'] })]);
  } });
  if (!id) return <EmptyState message={strings.contacts.notFound} />;
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <View><Text style={styles.error}>{contactError(query.error)}</Text><ErrorState retry={() => void query.refetch()} /></View>;
  const contact = query.data;
  return <Screen><FlashList data={contact.phones.map((text, index) => ({ text, index }))} keyExtractor={(item) => String(item.index)} contentContainerStyle={styles.content}
    ListHeaderComponent={<View style={styles.section}><Text accessibilityRole="header" style={styles.title}>{contact.name}</Text>{contact.isArchived && <Text>{strings.contacts.archivedLabel}</Text>}
      <Text style={styles.label}>{strings.contacts.organization}</Text><Text style={styles.text}>{contact.organization}</Text><Text style={styles.label}>{strings.contacts.jobTitle}</Text><Text style={styles.text}>{contact.jobTitle || strings.contacts.noInformation}</Text>
      <Text style={styles.label}>{strings.contacts.email}</Text><Text selectable style={styles.text}>{contact.email ?? strings.contacts.noInformation}</Text>
      <Text style={styles.label}>{strings.contacts.tags}</Text><Text style={styles.text}>{contact.tags.length ? contact.tags.join(' · ') : strings.contacts.noTags}</Text>
      <Text style={styles.label}>{strings.contacts.notes}</Text><Text style={styles.text}>{contact.notes || strings.contacts.noInformation}</Text>
      <Text>{strings.contacts.keyContact}: {contact.isKeyContact ? strings.routines.yes : strings.routines.no}</Text><Text style={styles.label}>{strings.contacts.phones}</Text></View>}
    renderItem={({ item }) => <Card><Text style={styles.label}>{strings.contacts.phone(item.index)}</Text><Text selectable style={styles.text}>{item.text}</Text></Card>}
    ListEmptyComponent={<Text style={styles.text}>{strings.contacts.noPhones}</Text>}
    ListFooterComponent={<View style={styles.section}>{archive.isError && <Text accessibilityRole="alert" style={styles.error}>{contactError(archive.error)}</Text>}
      {user?.role === 'CHEFE' && !contact.isArchived && <><Button label={strings.contacts.edit} disabled={archive.isPending} onPress={() => router.push({ pathname: '/contato/[id]/editar', params: { id: contact.id } })} />
        {!confirm ? <Button label={strings.contacts.archive} secondary onPress={() => setConfirm(true)} /> : <><Text>{strings.contacts.archiveHelp}</Text><Button label={strings.contacts.confirmArchive} loading={archive.isPending} onPress={() => archive.mutate()} /><Button label={strings.routines.cancel} secondary disabled={archive.isPending} onPress={() => setConfirm(false)} /></>}</>}
    </View>} /></Screen>;
}
export function ContactFormScreen({ mode }: { mode: 'create' | 'edit' }) {
  const params = useLocalSearchParams(); const valid = userIdParamsSchema.safeParse({ id: params.id }); const id = mode === 'edit' && valid.success ? valid.data.id : undefined;
  const { user } = useSession(); const query = useContact(user?.role === 'CHEFE' ? id : undefined); const router = useRouter();
  if (user?.role !== 'CHEFE') return <EmptyState message={strings.contacts.forbidden} />;
  if (mode === 'edit' && !id) return <EmptyState message={strings.contacts.notFound} />;
  if (mode === 'edit' && query.isPending) return <LoadingState />;
  if (mode === 'edit' && query.isError) return <View><Text style={styles.error}>{contactError(query.error)}</Text><ErrorState retry={() => void query.refetch()} /></View>;
  if (mode === 'edit' && query.data?.isArchived) return <EmptyState message={strings.contacts.archivedError} />;
  return <ContactForm key={id ?? 'new'} contact={mode === 'edit' ? query.data : undefined} onSaved={(saved) => router.replace({ pathname: '/contato/[id]', params: { id: saved.id } })}
    onCancel={() => { if (id) router.replace({ pathname: '/contato/[id]', params: { id } }); else router.replace('/contatos'); }} />;
}
const styles = StyleSheet.create({ content: { padding: 20 }, section: { gap: 12, paddingVertical: 16 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { fontSize: 25, fontWeight: '700', color: theme.text }, label: { fontSize: 16, fontWeight: '600', color: theme.text }, text: { fontSize: 15, lineHeight: 23, color: theme.muted }, error: { color: theme.danger, padding: 16 },
});
