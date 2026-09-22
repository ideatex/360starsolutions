import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Shareholder {
  id: string;
  shareholderId: string;
  name?: string;
  role: string;
  referralCode?: string;
  materializedPath?: string;
  phone?: string;
  email?: string;
  rank?: string;
}

export interface AuthState {
  shareholder: Shareholder | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (shareholder: Shareholder, token: string) => void;
  logout: () => void;
  setHydrated: (val: boolean) => void;
}

// Synchronously read from sessionStorage or localStorage on client to prevent logout on page refresh
function getSynchronousAuth(): { shareholder: Shareholder | null; token: string | null; isAuthenticated: boolean } {
  if (typeof window === 'undefined') {
    return { shareholder: null, token: null, isAuthenticated: false };
  }
  try {
    const raw = sessionStorage.getItem('auth-storage') || localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed?.state;
      if (state?.shareholder && state?.token) {
        return {
          shareholder: state.shareholder,
          token: state.token,
          isAuthenticated: true,
        };
      }
    }
  } catch (err) {
    console.error('Error reading auth-storage:', err);
  }
  return { shareholder: null, token: null, isAuthenticated: false };
}

const initialAuth = getSynchronousAuth();

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      shareholder: initialAuth.shareholder,
      token: initialAuth.token,
      isAuthenticated: initialAuth.isAuthenticated,
      isHydrated: typeof window !== 'undefined',
      login: (shareholder, token) => {
        if (typeof window !== 'undefined') {
          try {
            const payload = JSON.stringify({ state: { shareholder, token, isAuthenticated: true }, version: 0 });
            sessionStorage.setItem('auth-storage', payload);
            localStorage.setItem('auth-storage', payload);
          } catch (e) {}
        }
        set({ shareholder, token, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem('auth-storage');
            localStorage.removeItem('auth-storage');
          } catch (e) {}
        }
        set({ shareholder: null, token: null, isAuthenticated: false });
      },
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? sessionStorage : ({} as any))),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

