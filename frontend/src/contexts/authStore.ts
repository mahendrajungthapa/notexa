'use client';
import { create } from 'zustand';
import { authApi } from '@/services/api';

interface AuthState {
  user: any;
  stats: any;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: any, token: string) => void;
  setUser: (user: any) => void;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  stats: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: (user: any, token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notexa_token', token);
      localStorage.setItem('notexa_user', JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  setUser: (user: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notexa_user', JSON.stringify(user));
    }
    set({ user });
  },

  fetchMe: async () => {
    try {
      const r = await authApi.me();
      const user = r.data.user;
      const stats = r.data.stats;
      if (typeof window !== 'undefined') {
        localStorage.setItem('notexa_user', JSON.stringify(user));
      }
      set({ user, stats, isAuthenticated: true, isLoading: false });
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('notexa_token');
        localStorage.removeItem('notexa_user');
      }
      set({ user: null, token: null, stats: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('notexa_token');
      localStorage.removeItem('notexa_user');
    }
    set({ user: null, token: null, stats: null, isAuthenticated: false });
  },

  initialize: () => {
    if (typeof window === 'undefined') { set({ isLoading: false }); return; }
    const token = localStorage.getItem('notexa_token');
    const userStr = localStorage.getItem('notexa_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, isLoading: false });
        get().fetchMe();
      } catch { set({ isLoading: false }); }
    } else { set({ isLoading: false }); }
  },
}));
