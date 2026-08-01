import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Shareholder {
  id: string;
  shareholderId: string;
  role: string;
  referralCode?: string;
  materializedPath?: string;
}

interface AuthState {
  shareholder: Shareholder | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (shareholder: Shareholder, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      shareholder: null,
      token: null,
      isAuthenticated: false,
      login: (shareholder, token) => set({ shareholder, token, isAuthenticated: true }),
      logout: () => set({ shareholder: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
