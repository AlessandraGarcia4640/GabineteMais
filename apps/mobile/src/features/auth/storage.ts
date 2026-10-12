import { refreshRequestSchema } from '@gabinete-plus/shared';
import { z } from 'zod';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthFailure } from './errors.js';
export const storedSessionSchema = refreshRequestSchema.extend({ refreshExpiresAt: z.iso.datetime(), apiUrl: z.url() }).strict();
export type StoredSession = z.infer<typeof storedSessionSchema>;
export interface SessionStorage { read: () => Promise<StoredSession | null>; save: (session: StoredSession) => Promise<void>; clear: () => Promise<void> }
const key = 'gabinete-plus.session.v1';
let webSession: StoredSession | null = null;
export const secureSessionStorage: SessionStorage = {
  async read() {
    if (Platform.OS === 'web') return webSession;
    try {
      const value = await SecureStore.getItemAsync(key); if (!value) return null;
      let session: StoredSession;
      try { session = storedSessionSchema.parse(JSON.parse(value)); }
      catch { await SecureStore.deleteItemAsync(key); return null; }
      return session;
    } catch { throw new AuthFailure('storage'); }
  },
  async save(session) {
    const validated = storedSessionSchema.parse(session);
    if (Platform.OS === 'web') { webSession = validated; return; }
    try { await SecureStore.setItemAsync(key, JSON.stringify(validated), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); }
    catch { throw new AuthFailure('storage'); }
  },
  async clear() {
    webSession = null; if (Platform.OS === 'web') return;
    try { await SecureStore.deleteItemAsync(key); } catch { throw new AuthFailure('storage'); }
  },
};
