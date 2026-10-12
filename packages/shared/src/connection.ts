import { z } from 'zod';
export const connectionUrlSchema = z.string().trim().max(2048).pipe(z.url()).refine((value) => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash; } catch { return false; } }, 'Endereço de acesso inválido.').transform((value) => new URL(value).toString().replace(/\/+$/, ''));
export const connectionFormSchema = z.object({ url: connectionUrlSchema }).strict();
