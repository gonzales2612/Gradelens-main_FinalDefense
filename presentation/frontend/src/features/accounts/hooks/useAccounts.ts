// features/accounts/hooks/useAccounts.ts
import { useState, useCallback } from "react";
import { accountsApi } from "@/features/accounts/api/accounts.api";
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  AccountStatsResponse,
} from "../types/accounts.types";
import { getErrorMessage } from "@/lib/error";

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [stats, setStats] = useState<AccountStatsResponse["stats"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadAccounts = useCallback(async (params?: {
    role?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountsApi.list(params);
      setAccounts(data.users);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load accounts");
      console.error("Failed to load accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccount = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountsApi.getById(id);
      setSelectedAccount(data.user);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load account");
      console.error("Failed to load account:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountsApi.getStats();
      setStats(data.stats);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load stats");
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = useCallback(async (account: CreateAccountRequest) => {
    setLoading(true);
    setError(null);
    try {
      await accountsApi.create(account);
      await loadAccounts();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to create account");
      console.error("Failed to create account:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadAccounts]);

  const updateAccount = useCallback(async (id: string, updates: UpdateAccountRequest) => {
    setLoading(true);
    setError(null);
    try {
      await accountsApi.update(id, updates);
      await loadAccounts();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to update account");
      console.error("Failed to update account:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadAccounts]);

  const deleteAccount = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await accountsApi.delete(id);
      await loadAccounts();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to delete account");
      console.error("Failed to delete account:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadAccounts]);

  return {
    accounts,
    selectedAccount,
    stats,
    loading,
    error,
    total,
    loadAccounts,
    loadAccount,
    loadStats,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}