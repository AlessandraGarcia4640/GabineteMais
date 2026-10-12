import { z } from 'zod';
import { contactListQuerySchema, contactPageSchema, contactSchema, createContactSchema, updateContactSchema, userIdParamsSchema, type CreateContact, type UpdateContact } from '@gabinete-plus/shared';
import type { HttpAuthApi } from '../auth/api.js';
import type { SessionManager } from '../auth/session-manager.js';
import { ApiFailure } from '../../lib/api-error.js';
export class ContactsApi {
  constructor(private readonly http: HttpAuthApi, private readonly manager: SessionManager) {}
  list(input: z.input<typeof contactListQuerySchema>, signal?: AbortSignal) {
    const params = new URLSearchParams(); for (const [key, value] of Object.entries(contactListQuerySchema.parse(input))) if (value !== undefined) params.set(key, String(value));
    return this.manager.authorized((token) => this.http.get(`/contacts?${params.toString()}`, contactPageSchema, token, signal));
  }
  get(id: string, signal?: AbortSignal) {
    const target = userIdParamsSchema.parse({ id }); return this.manager.authorized((token) => this.http.get(`/contacts/${encodeURIComponent(target.id)}`, contactSchema, token, signal));
  }
  private async manage<T>(request: (token: string) => Promise<T>): Promise<T> {
    try { return await this.manager.authorized((token) => {
      if (this.manager.store.getState().user?.role !== 'CHEFE') throw new ApiFailure('FORBIDDEN', 403); return request(token);
    }); } catch (error) { if (error instanceof ApiFailure && error.status === 403) await this.manager.validate(); throw error; }
  }
  create(input: CreateContact) { const valid = createContactSchema.parse(input); return this.manage((token) => this.http.send('/contacts', contactSchema, 'POST', valid, token)); }
  update(id: string, input: UpdateContact) {
    const target = userIdParamsSchema.parse({ id }); const valid = updateContactSchema.parse(input);
    return this.manage((token) => this.http.send(`/contacts/${encodeURIComponent(target.id)}`, contactSchema, 'PATCH', valid, token));
  }
  archive(id: string) { const target = userIdParamsSchema.parse({ id }); return this.manage((token) => this.http.send(`/contacts/${encodeURIComponent(target.id)}`, z.void(), 'DELETE', undefined, token)); }
}
