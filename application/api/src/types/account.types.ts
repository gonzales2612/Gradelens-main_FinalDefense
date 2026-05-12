// types/account.types.ts

export interface CreateAccountRequest {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role?: "teacher" | "admin";
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UpdateAccountRequest {
  email?: string;
  password?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  role?: "teacher" | "admin";
  isActive?: boolean;
  emailVerified?: boolean;
}