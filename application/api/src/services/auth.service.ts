import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request } from "express";

import { UserModel } from "../models/User.ts";
import type { AuthUser } from "../types/auth.types.ts";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

type LoginInput = {
  email: string;
  password: string;
};

type AuthResult = {
  user: AuthUser;
  accessToken: string;
};

type LoginResult = AuthResult & {
  refreshToken: string;
};

/**
 * ============================
 * Helpers
 * ============================
 */

function signAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET!,
    {
      expiresIn: ACCESS_TOKEN_TTL,
    }
  );
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function toAuthUser(user: any): AuthUser {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };
}

/**
 * ============================
 * Services
 * ============================
 */

export async function loginService(
  input: LoginInput
): Promise<LoginResult> {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');;

  console.log("User found:", user);

  if (!user || !user.passwordHash) {
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    throw new Error("Account disabled");
  }

  const passwordMatch = await bcrypt.compare(
    input.password,
    user.passwordHash
  );

  if (!passwordMatch) {
    throw new Error("Invalid credentials");
  }

  const authUser = toAuthUser(user);
  const accessToken = signAccessToken(authUser);

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  user.refreshTokens.push({
    tokenHash: refreshTokenHash,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  await user.save();

  return {
    user: authUser,
    accessToken,
    refreshToken,
  };
}

/**
 * Rotate refresh token
 */
export async function refreshService(
  refreshToken: string
): Promise<
  AuthResult & { newRefreshToken: string }
> {
  console.log("Refresh token received (first 16 chars):", refreshToken.substring(0, 16));
  
  const tokenHash = hashToken(refreshToken);
  console.log("Token hash (first 16 chars):", tokenHash.substring(0, 16));

  const user = await UserModel.findOne({
    "refreshTokens.tokenHash": tokenHash,
  });

  if (!user) {
    console.log("No user found with this token hash");
    throw new Error("Invalid refresh token");
  }

  console.log("User found:", user.email);
  console.log("User's refresh tokens count:", user.refreshTokens.length);

  const storedToken = user.refreshTokens.find(
    (t: any) => t.tokenHash === tokenHash
  );

  if (!storedToken || storedToken.expiresAt < new Date()) {
    console.log("Token expired or not found in user's tokens");
    throw new Error("Refresh token expired");
  }

  // 🔐 Rotate token
  user.refreshTokens = user.refreshTokens.filter(
    (t: any) => t.tokenHash !== tokenHash
  );

  const newRefreshToken = generateRefreshToken();
  user.refreshTokens.push({
    tokenHash: hashToken(newRefreshToken),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  await user.save();

  const authUser = toAuthUser(user);
  const accessToken = signAccessToken(authUser);

  return {
    user: authUser,
    accessToken,
    newRefreshToken,
  };
}

/**
 * Logout (invalidate refresh token)
 */
export async function logoutService(
  refreshToken: string
): Promise<void> {
  const tokenHash = hashToken(refreshToken);

  await UserModel.updateOne(
    {},
    {
      $pull: {
        refreshTokens: { tokenHash },
      },
    }
  );
}

/**
 * Get current user (used by /auth/me)
 */
export async function meService(req: Request): Promise<AuthUser> {
  // req.user will come from auth middleware
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new Error("Unauthorized. Service User ID Not Found.");
  }

  const user = await UserModel.findById(userId);

  if (!user || !user.isActive) {
    throw new Error("Unauthorized. Service User Not Found or Active.");
  }

  return toAuthUser(user);
}
