import { Request, Response } from "express";
import {
  loginService,
  refreshService,
  logoutService,
  meService,
} from "../services/auth.service.ts";
import { API_ROUTES } from "../constants/routes.ts";

/**
 * POST /auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    console.log("Login attempt:", { email, hasPassword: !!password });

    const { user, accessToken, refreshToken } =
      await loginService({ email, password });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: true, // Set to true when HTTPS is available
      sameSite: "lax",
      path: API_ROUTES.BASE.API,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    return res.status(200).json({
      user,
      accessToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }
};

/**
 * POST /auth/refresh
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    console.log("Refresh attempt - cookies:", req.cookies);
    console.log("Refresh attempt - headers:", req.headers.cookie);
    
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      console.log("No refresh token found in cookies");
      return res.status(401).json({ message: "Unauthorized. Token Not Found." });
    }

    console.log("Refresh token found, attempting refresh");

    const { user, accessToken, newRefreshToken } =
      await refreshService(refreshToken);

    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: true, // Set to true when HTTPS is available
      sameSite: "lax",
      path: API_ROUTES.BASE.API,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    console.log("Refresh successful");

    return res.status(200).json({
      user,
      accessToken,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(401).json({ message: "Unauthorized. Refresh Failed" });
  }
};

/**
 * POST /auth/logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      await logoutService(refreshToken);
    }

    res.clearCookie("refresh_token", {
      path: API_ROUTES.BASE.API,
    });

    return res.status(204).send();
  } catch {
    return res.status(204).send();
  }
};

/**
 * GET /auth/me
 */
export const me = async (req: Request, res: Response) => {
  try {
    // req.user will be populated later by auth middleware
    const user = await meService(req);

    return res.status(200).json({ user });
  } catch {
    return res.status(401).json({ message: "Unauthorized. User Not Found." });
  }
};
