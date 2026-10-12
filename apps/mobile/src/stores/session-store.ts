import { create } from 'zustand';
import type { LoginResponse, SessionUser } from '../lib/api';

type SessionState = {
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: LoginResponse) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  setSession: (session) =>
    set({
      user: session.user,
      accessToken: session.tokens.accessToken,
      refreshToken: session.tokens.refreshToken,
    }),
  clearSession: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
    }),
}));
