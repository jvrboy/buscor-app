import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Card, AppView, AppSettings } from '@/lib/types';

const DEFAULT_SETTINGS: AppSettings = {
  nfcEnabled: true,
  nfcAutoTap: false,
  notificationsEnabled: true,
  lowBalanceAlert: true,
  tripAlerts: true,
  biometricLogin: false,
  darkMode: 'system',
  language: 'en',
  currency: 'ZAR',
  autoTopUp: false,
  autoTopUpAmount: 50,
  lowBalanceThreshold: 20,
};

interface AuthState {
  user: User | null;
  card: Card | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  setAuth: (user: User, card: Card) => void;
  setGuest: () => void;
  updateCard: (card: Partial<Card>) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
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
      isGuest: false,
      setAuth: (user, card) => set({ user, card, isAuthenticated: true, isGuest: false }),
      setGuest: () =>
        set({
          user: { id: 'guest', fullName: 'Guest', email: '' },
          card: {
            id: 'guest',
            cardNumber: '0000000000000000',
            userId: 'guest',
            balance: 150.00,
            status: 'active',
            type: 'standard',
          },
          isAuthenticated: true,
          isGuest: true,
        }),
      updateCard: (updates) =>
        set((state) => ({
          card: state.card ? { ...state.card, ...updates } : null,
        })),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      logout: () => set({ user: null, card: null, isAuthenticated: false, isGuest: false }),
    }),
    {
      name: 'buscor-auth',
      partialize: (state) => ({
        user: state.user,
        card: state.card,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'buscor-settings',
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