/**
 * ============================
 * Core Auth Types
 * ============================
 */

/**
 * Roles supported by the system.
 * Must stay in sync with UserModel.role enum.
 */
export type UserRole = "teacher" | "admin";

/**
 * User shape exposed to the outside world.
 * NEVER include password hashes or internal fields.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * ============================
 * Service Inputs
 * ============================
 */

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * ============================
 * Service Outputs
 * ============================
 */

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
}

export interface LoginResult extends AuthResult {
  refreshToken: string;
}

export interface RefreshResult extends AuthResult {
  newRefreshToken: string;
}

/**
 * ============================
 * JWT Payload
 * ============================
 */

export interface JwtPayload {
  sub: string; // user id
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * ============================
 * Express Request Augmentation
 * ============================
 */

declare global {
  namespace Express {
    interface User {
      id: string;
      role: UserRole;
    }

    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}
