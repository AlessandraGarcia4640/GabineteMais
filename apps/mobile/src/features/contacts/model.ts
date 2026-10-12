import { z } from 'zod';
import { createContactSchema, updateContactSchema, type Contact, type CreateContact, type UpdateContact } from '@gabinete-plus/shared';
const fields = z.object({ name: z.string(), organization: z.string(), jobTitle: z.string(), email: z.string(), notes: z.string(), isKeyContact: z.boolean(),
  phones: z.array(z.object({ text: z.string() })), tags: z.array(z.object({ text: z.string() })) });
export type ContactFormValues = z.infer<typeof fields>;
function payload(values: ContactFormValues) { return { ...values, email: values.email.trim() || null, phones: values.phones.map((phone) => phone.text), tags: values.tags.map((tag) => tag.text) }; }
export const contactFormSchema = fields.superRefine((values, context) => {
  const result = createContactSchema.safeParse(payload(values));
  if (!result.success) for (const issue of result.error.issues) context.addIssue({ code: 'custom', path: (issue.path[0] === 'phones' || issue.path[0] === 'tags') && typeof issue.path[1] === 'number' ? [issue.path[0], issue.path[1], 'text'] : issue.path, message: issue.message });
});
export function contactPayload(values: ContactFormValues): CreateContact { return createContactSchema.parse(payload(values)); }
export function initialContactValues(contact?: Contact): ContactFormValues {
  return { name: contact?.name ?? '', organization: contact?.organization ?? '', jobTitle: contact?.jobTitle ?? '', email: contact?.email ?? '', notes: contact?.notes ?? '', isKeyContact: contact?.isKeyContact ?? false,
    phones: contact?.phones.map((text) => ({ text })) ?? [], tags: contact?.tags.map((text) => ({ text })) ?? [] };
}
export function contactChanges(original: Contact, next: CreateContact): UpdateContact | null {
  const changes: UpdateContact = {};
  if (original.name !== next.name) changes.name = next.name;
  if (original.organization !== next.organization) changes.organization = next.organization;
  if (original.jobTitle !== next.jobTitle) changes.jobTitle = next.jobTitle;
  if (original.email !== next.email) changes.email = next.email;
  if (original.notes !== next.notes) changes.notes = next.notes;
  if (original.isKeyContact !== next.isKeyContact) changes.isKeyContact = next.isKeyContact;
  if (JSON.stringify(original.phones) !== JSON.stringify(next.phones)) changes.phones = next.phones;
  if (JSON.stringify(original.tags) !== JSON.stringify(next.tags)) changes.tags = next.tags;
  return Object.keys(changes).length ? updateContactSchema.parse(changes) : null;
}
