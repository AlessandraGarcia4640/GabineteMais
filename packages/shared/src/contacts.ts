import { z } from 'zod';

const phone = z.string().trim().min(3).max(40).refine((value) => {
  const digits = value.replace(/\D/g, '').length;
  return digits >= 8 && digits <= 20 && /^\+?[\d\s()\-./]+(?:\s*(?:ramal|x)\s*\d+)?$/i.test(value);
}, 'Informe um telefone válido, com DDD quando aplicável.');
const fields = {
  name: z.string().trim().min(1).max(150), organization: z.string().trim().min(1).max(200),
  jobTitle: z.string().trim().max(150), phones: z.array(phone).max(10),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()).nullable(), notes: z.string().trim().max(4000),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20).transform((values) => [...new Set(values)]),
  isKeyContact: z.boolean(),
};
export const createContactSchema = z.object({ ...fields, jobTitle: fields.jobTitle.default(''), phones: fields.phones.default([]),
  email: fields.email.default(null), notes: fields.notes.default(''), tags: fields.tags.default([]), isKeyContact: fields.isKeyContact.default(false) }).strict();
export type CreateContact = z.infer<typeof createContactSchema>;
export const updateContactSchema = z.object(fields).partial().strict().refine((value) => Object.values(value).some((field) => field !== undefined), 'Informe ao menos um campo.');
export type UpdateContact = z.infer<typeof updateContactSchema>;
export const contactSchema = z.object({ ...fields, id: z.string().min(1), isArchived: z.boolean(),
  createdById: z.string().min(1), updatedById: z.string().min(1), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export type Contact = z.infer<typeof contactSchema>;
export const contactListQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).max(128).optional(), q: z.string().trim().min(1).max(100).optional(),
  organization: z.string().trim().min(1).max(200).optional(), tag: z.string().trim().toLowerCase().min(1).max(40).optional(),
  isArchived: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  isKeyContact: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
}).strict();
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export const contactPageSchema = z.object({ items: z.array(contactSchema).max(100), nextCursor: z.string().nullable() });
export type ContactPage = z.infer<typeof contactPageSchema>;
