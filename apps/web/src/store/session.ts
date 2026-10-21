import { create } from 'zustand';
import type { Session } from '@4this/shared';
import { api } from '../api/endpoints';

interface SessionState {
  session: Session;
  loading: boolean;
  /** 서버에 물어 세션을 새로 고친다. 실패하면 guest */
  refresh: () => Promise<void>;
  /** 로그인·가입 응답을 그대로 넣는다 */
  setSession: (session: Session) => void;
}

export const useSession = create<SessionState>()((set) => ({
  session: { kind: 'guest' },
  loading: true,
  refresh: async () => {
    try {
      set({ session: await api.session(), loading: false });
    } catch {
      set({ session: { kind: 'guest' }, loading: false });
    }
  },
  setSession: (session) => set({ session }),
}));
