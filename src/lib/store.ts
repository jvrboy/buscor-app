import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Card, AppView } from '@/lib/types';

interface AuthState {
  user: User | null;
  card: Card | null;
  isAuthenticated: boolean;
  setAuth: (user: User, card: Card) => void;
  updateCard: (card: Partial<Card>) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

interface AppState {
  currentView: AppView;
  previousView: AppView | null;
  navigate: (view: AppView) => void;
  goBack: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      card: null,
      isAuthenticated: false,
      setAuth: (user, card) => set({ user, card, isAuthenticated: true }),
      updateCard: (updates) =>
        set((state) => ({
          card: state.card ? { ...state.card, ...updates } : null,
        })),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      logout: () => set({ user: null, card: null, isAuthenticated: false }),
    }),
    {
      name: 'buscor-auth',
      partialize: (state) => ({
        user: state.user,
        card: state.card,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const useAppStore = create<AppState>()((set) => ({
  currentView: 'login',
  previousView: null,
  navigate: (view) =>
    set((state) => ({ previousView: state.currentView, currentView: view })),
  goBack: () =>
    set((state) => ({
      currentView: state.previousView || 'dashboard',
      previousView: null,
    })),
}));