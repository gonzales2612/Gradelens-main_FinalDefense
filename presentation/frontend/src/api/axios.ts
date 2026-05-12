// api/axios.ts
import axios from "axios";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { config } from "@/lib/config";

export const api = axios.create({
  baseURL: config.apiBaseUrl,
  withCredentials: true, // refresh cookie
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
