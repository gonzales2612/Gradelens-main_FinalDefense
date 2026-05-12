import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types/auth.types.ts";

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.substring(7);
        const secret = process.env.JWT_ACCESS_SECRET || "dev-access-secret-key-change-in-production";

        const decoded = jwt.verify(token, secret) as JwtPayload;

        // Attach user to request using the standard Express.Request.user shape from auth.types.ts
        req.user = {
        id: decoded.sub,
        role: decoded.role
        };
        
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: "Invalid token" });
        }
        next(error);
    }
};
