import { api } from "@/api/axios";
import type { LoginRequest, LoginResponse } from "../types/auth.types";
import { AUTH_API_ROUTES } from "@/lib/constants";

export const loginApi = async (
  payload: LoginRequest
): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>(
    AUTH_API_ROUTES.LOGIN,
    payload
  );
  return data;
};

export const refreshApi = async (): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>(AUTH_API_ROUTES.REFRESH);
  return data;
};

export const logoutApi = async (): Promise<void> => {
  await api.post(AUTH_API_ROUTES.LOGOUT);
};
