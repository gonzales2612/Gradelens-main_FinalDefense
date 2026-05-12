// features/accounts/types/accounts.types.ts

/**
 * Account TypeScript Types
 * Frontend type definitions for User/Account entity
 */

export type UserRole = "teacher" | "admin";

export interface Account {
  _id: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UpdateAccountRequest {
  email?: string;
  password?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface AccountListResponse {
  users: Account[];
  total: number;
  page?: number;
  limit?: number;
  pages?: number;
}

export interface AccountStatsResponse {
  stats: {
    total: number;
    active: number;
    inactive: number;
    teachers: number;
    admins: number;
  };
}