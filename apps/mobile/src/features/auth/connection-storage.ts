import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { connectionUrlSchema } from '@gabinete-plus/shared';
const key = 'gabinete.connection.v1';
let webUrl: string | null = null;
export async function readConnectionUrl(): Promise<string | null> { const saved = Platform.OS === 'web' ? webUrl : await SecureStore.getItemAsync(key); if (!saved) return null; const result = connectionUrlSchema.safeParse(saved); return result.success ? result.data : null; }
export async function saveConnectionUrl(url: string): Promise<void> { const valid = connectionUrlSchema.parse(url); if (Platform.OS === 'web') webUrl = valid; else await SecureStore.setItemAsync(key, valid, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); }
export async function clearConnectionUrl(): Promise<void> { if (Platform.OS === 'web') webUrl = null; else await SecureStore.deleteItemAsync(key); }
