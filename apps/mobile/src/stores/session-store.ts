import { createStore } from 'zustand/vanilla';
import type { UserSummary } from '@gabinete-plus/shared';
import type { AuthErrorCode } from '../features/auth/errors.js';
export interface SessionState { status: 'initializing' | 'anonymous' | 'authenticated' | 'recovery'; user: UserSummary | null; errorCode: AuthErrorCode | null }
export function createSessionStore() {
  return createStore<SessionState>(() => ({ status: 'initializing', user: null, errorCode: null }));
}
