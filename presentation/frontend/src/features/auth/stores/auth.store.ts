// features/auth/stores/auth.store.ts
import { create } from "zustand";
import { loginApi, refreshApi, logoutApi } from "../api/auth.api";
import type { AuthUser } from "../types/auth.types";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrating: boolean; // Add this flag

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  isHydrating: false, // Add this

  async login(email, password) {
    const res = await loginApi({ email, password });
    set({
      user: res.user,
      accessToken: res.accessToken,
      isAuthenticated: true,
      isLoading: false, // Set to false after login
    });
  },

  async logout() {
    await logoutApi();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  async hydrate() {
    // Prevent multiple simultaneous hydrate calls
    if (get().isHydrating) {
      return;
    }

    set({ isHydrating: true });

    try {
      const res = await refreshApi();
      set({
        user: res.user,
        accessToken: res.accessToken,
        isAuthenticated: true,
      });
    } catch {
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false, isHydrating: false });
    }
  },
}));
