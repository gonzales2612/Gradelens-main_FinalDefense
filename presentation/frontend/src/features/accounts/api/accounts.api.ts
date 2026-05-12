// features/accounts/api/accounts.api.ts
import { api } from "@/api/axios";
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  AccountListResponse,
  AccountStatsResponse,
} from "../types/accounts.types";

export const accountsApi = {
    /**
     * Get all accounts
     */
    async list(params?: {
        role?: string;
        isActive?: boolean;
        page?: number;
        limit?: number;
    }): Promise<AccountListResponse> {
        const { data } = await api.get("/accounts", { params });
        return data;
    },

    /**
     * Get account by ID
     */
    async getById(id: string): Promise<{ user: Account }> {
        const { data } = await api.get(`/accounts/${id}`);
        return data;
    },

    /**
     * Get account statistics
     */
    async getStats(): Promise<AccountStatsResponse> {
        const { data } = await api.get("/accounts/stats");
        return data;
    },

    /**
     * Create new account
     */
    async create(account: CreateAccountRequest): Promise<{ message: string; user: Account }> {
        const { data } = await api.post("/accounts", account);
        return data;
    },

    /**
     * Update account
     */
    async update(
        id: string,
        updates: UpdateAccountRequest
    ): Promise<{ message: string; user: Account }> {
        const { data } = await api.put(`/accounts/${id}`, updates);
        return data;
    },

    /**
     * Delete (deactivate) account
     */
    async delete(id: string): Promise<{ message: string }> {
        const { data } = await api.delete(`/accounts/${id}`);
        return data;
    },
};