import { create } from 'zustand';

type SessionState = {
  userName: string | null;
  setUserName: (userName: string) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  userName: null,
  setUserName: (userName) => set({ userName }),
  clearSession: () => set({ userName: null }),
}));
