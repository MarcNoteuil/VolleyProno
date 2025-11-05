import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  pseudo: string;
  role?: 'USER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, pseudo: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist<AuthStore>(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, accessToken, refreshToken } = response.data.data;
          
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Erreur de connexion');
        }
      },

      register: async (email: string, pseudo: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/register', { email, pseudo, password });
          const { user, accessToken, refreshToken } = response.data.data;
          
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Erreur lors de l\'inscription');
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        window.location.href = '/login';
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return;

        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { accessToken } = response.data.data;
          set({ accessToken });
        } catch (error) {
          get().logout();
        }
      },

      initializeAuth: async () => {
        const state = get();
        
        // Synchroniser isAuthenticated avec les données présentes
        if (state.accessToken && state.user && !state.isAuthenticated) {
          set({ isAuthenticated: true });
        } else if ((!state.accessToken || !state.user) && state.isAuthenticated) {
          set({ isAuthenticated: false });
        }
        
        const { accessToken, refreshToken, user, isAuthenticated } = state;
        
        // Si on a déjà un token et un utilisateur, on est connecté
        if (accessToken && user) {
          if (!isAuthenticated) {
            set({ isAuthenticated: true });
          }
          return;
        }

        // Si on a un refresh token mais pas de token, essayer de rafraîchir
        if (refreshToken && !accessToken && user) {
          try {
            await get().refreshAccessToken();
            set({ isAuthenticated: true });
          } catch (error) {
            console.log('Impossible de rafraîchir le token');
            get().logout();
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => {
        const persisted: {
          user: User | null;
          accessToken: string | null;
          refreshToken: string | null;
          isAuthenticated: boolean;
        } = {
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        };
        return persisted as AuthStore;
      },
    }
  )
);
