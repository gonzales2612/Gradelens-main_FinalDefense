// controllers/account.controller.ts
import { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/User.ts";
import bcrypt from "bcrypt";
import type { CreateAccountRequest, UpdateAccountRequest } from "../types/account.types.ts";

/**
 * Account Controller
 * Handles CRUD operations for user accounts (admin only)
 */
export class AccountController {
    /**
     * Create a new user account
     * POST /api/accounts
     */
    static async createAccount(req: Request, res: Response, next: NextFunction) {
        try {
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Only admins can create accounts
        if (currentUser.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin access required" });
        }

        const data: CreateAccountRequest = req.body;

        // Validate required fields
        if (!data.email || !data.password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Check if email already exists
        const existing = await UserModel.findOne({ email: data.email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: "Email already exists" });
        }

        if (!data.firstName || !data.lastName) {
            return res.status(400).json({ error: "First name and last name are required" });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, 10);

        // Create user
        const user = new UserModel({
            email: data.email.toLowerCase(),
            passwordHash,
            firstName: data.firstName.trim(),
            middleName: data.middleName?.trim(),
            lastName: data.lastName.trim(),
            role: data.role || "teacher",
            isActive: data.isActive !== undefined ? data.isActive : true,
            emailVerified: data.emailVerified || false,
        });

        await user.save();

        // Return user without password hash
        const userResponse = user.toObject();
        delete userResponse.passwordHash;
        delete userResponse.refreshTokens;

        res.status(201).json({
            message: "Account created successfully",
            user: userResponse,
        });
        } catch (error) {
        next(error);
        }
    }

    /**
     * Get all user accounts
     * GET /api/accounts
     */
    static async listAccounts(req: Request, res: Response, next: NextFunction) {
        try {
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Only admins can list accounts
        if (currentUser.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin access required" });
        }

        const { role, isActive, page = 1, limit = 50 } = req.query;

        const query: any = {};

        if (role) {
            query.role = role;
        }

        if (isActive !== undefined) {
            query.isActive = isActive === "true";
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [users, total] = await Promise.all([
            UserModel.find(query)
            .select("-passwordHash -refreshTokens")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),
            UserModel.countDocuments(query),
        ]);

        res.json({
            users,
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
        });
        } catch (error) {
        next(error);
        }
    }

    /**
     * Get account by ID
     * GET /api/accounts/:id
     */
    static async getAccount(req: Request, res: Response, next: NextFunction) {
        try {
        const { id } = req.params;
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Only admins can view accounts
        if (currentUser.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin access required" });
        }

        const user = await UserModel.findById(id)
            .select("-passwordHash -refreshTokens")
            .lean();

        if (!user) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json({ user });
        } catch (error) {
        next(error);
        }
    }

    /**
     * Update account
     * PUT /api/accounts/:id
     */
    static async updateAccount(req: Request, res: Response, next: NextFunction) {
        try {
        const { id } = req.params;
        const currentUser = req.user;
        const updates: UpdateAccountRequest = req.body;

        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Only admins can update accounts
        if (currentUser.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin access required" });
        }

        const user = await UserModel.findById(id);

        if (!user) {
            return res.status(404).json({ error: "Account not found" });
        }

        // Prevent self-demotion (admin cannot change their own role)
        if (id === currentUser.id && updates.role && updates.role !== currentUser.role) {
            return res.status(400).json({ error: "Cannot change your own role" });
        }

        // Prevent self-deactivation
        if (id === currentUser.id && updates.isActive === false) {
            return res.status(400).json({ error: "Cannot deactivate your own account" });
        }

        // Update email if provided
        if (updates.email && updates.email !== user.email) {
            const existing = await UserModel.findOne({ email: updates.email.toLowerCase() });
            if (existing && existing._id.toString() !== id) {
            return res.status(409).json({ error: "Email already exists" });
            }
            user.email = updates.email.toLowerCase();
        }

        // Update password if provided
        if (updates.password) {
            user.passwordHash = await bcrypt.hash(updates.password, 10);
            // Clear all refresh tokens on password change
            user.refreshTokens = [];
        }

        // Update other fields
        if (updates.role !== undefined) user.role = updates.role;
        if (updates.isActive !== undefined) user.isActive = updates.isActive;
        if (updates.emailVerified !== undefined) user.emailVerified = updates.emailVerified;
        if (updates.firstName) user.firstName = updates.firstName.trim();
        if (updates.middleName !== undefined) user.middleName = updates.middleName?.trim();
        if (updates.lastName) user.lastName = updates.lastName.trim();
        
        await user.save();

        // Return user without sensitive data
        const userResponse = user.toObject();
        delete userResponse.passwordHash;
        delete userResponse.refreshTokens;

        res.json({
            message: "Account updated successfully",
            user: userResponse,
        });
        } catch (error) {
        next(error);
        }
    }

    /**
     * Delete (deactivate) account
     * DELETE /api/accounts/:id
     */
    static async deleteAccount(req: Request, res: Response, next: NextFunction) {
        try {
        const { id } = req.params;
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Only admins can delete accounts
        if (currentUser.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin access required" });
        }

        // Prevent self-deletion
        if (id === currentUser.id) {
            return res.status(400).json({ error: "Cannot delete your own account" });
        }

        const user = await UserModel.findById(id);

        if (!user) {
            return res.status(404).json({ error: "Account not found" });
        }

        // Soft delete - deactivate account and clear tokens
        user.isActive = false;
        user.refreshTokens = [];
        await user.save();

        res.json({
            message: "Account deactivated successfully",
        });
        } catch (error) {
        next(error);
        }
    }

    /**
     * Get account statistics
     * GET /api/accounts/stats
     */
    static async getAccountStats(req: Request, res: Response, next: NextFunction) {
        try {
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (currentUser.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin access required" });
        }

        const [total, active, inactive, teachers, admins] = await Promise.all([
            UserModel.countDocuments(),
            UserModel.countDocuments({ isActive: true }),
            UserModel.countDocuments({ isActive: false }),
            UserModel.countDocuments({ role: "teacher" }),
            UserModel.countDocuments({ role: "admin" }),
        ]);

        res.json({
            stats: {
            total,
            active,
            inactive,
            teachers,
            admins,
            },
        });
        } catch (error) {
        next(error);
        }
    }
}