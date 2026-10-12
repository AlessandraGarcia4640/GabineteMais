import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from 'zustand';
import { HttpAuthApi } from '../features/auth/api';
import { queryAuthApi } from '../features/auth/query-api';
import { secureSessionStorage } from '../features/auth/storage';
import { SessionManager } from '../features/auth/session-manager';
export const SessionContext = createContext<SessionManager | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const client = useQueryClient();
  const [manager] = useState(() => new SessionManager({ api: queryAuthApi(client, new HttpAuthApi(process.env.EXPO_PUBLIC_API_URL)), storage: secureSessionStorage, clearCache: () => client.clear() }));
  useEffect(() => {
    void manager.start();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void manager.validate(); });
    return () => subscription.remove();
  }, [manager]);
  return <SessionContext.Provider value={manager}>{children}</SessionContext.Provider>;
}
export function useSessionManager(): SessionManager {
  const manager = useContext(SessionContext); if (!manager) throw new Error('SessionProvider ausente.'); return manager;
}
export function useSession() { return useStore(useSessionManager().store); }
