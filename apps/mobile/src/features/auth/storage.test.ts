import * as SecureStore from 'expo-secure-store';
import { secureSessionStorage, storedSessionSchema } from './storage';
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(), WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only' }));
const record = { refreshToken: 'A'.repeat(43), refreshExpiresAt: '2099-01-01T00:00:00Z', apiUrl: 'https://api.example.invalid' };
beforeEach(() => { jest.clearAllMocks(); });
it('usa armazenamento nativo seguro e não aceita access token ou senha persistidos', async () => {
  await secureSessionStorage.save(record);
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('gabinete-plus.session.v1', JSON.stringify(record), { keychainAccessible: 'device-only' });
  expect(storedSessionSchema.safeParse({ ...record, password: 'segredo' }).success).toBe(false);
  expect(storedSessionSchema.safeParse({ ...record, accessToken: 'token' }).success).toBe(false);
});
it('conteúdo corrompido é removido e exige novo login', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue('invalid-json');
  expect(await secureSessionStorage.read()).toBeNull(); expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('gabinete-plus.session.v1');
});
it('erro do armazenamento nativo não é interpretado como sessão válida', async () => {
  jest.mocked(SecureStore.getItemAsync).mockRejectedValue(new Error('Keychain failure'));
  await expect(secureSessionStorage.read()).rejects.toMatchObject({ code: 'storage' });
});
