import mongoose, { Schema, Document } from "mongoose";

/**
 * ============================
 * Types
 * ============================
 */

export type UserRole = "teacher" | "admin";

export interface RefreshToken {
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  refreshTokens: RefreshToken[];

  createdAt: Date;
  updatedAt: Date;
}

/**
 * ============================
 * Schemas
 * ============================
 */

const RefreshTokenSchema = new Schema<RefreshToken>(
  {
    tokenHash: {
      type: String,
      required: true,
      // index defined at schema level below
    },
    createdAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false } // prevent subdocument _id bloat
);

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false, // 🔐 never returned unless explicitly requested
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    middleName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["teacher", "admin"],
      required: true,
      default: "teacher",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    refreshTokens: {
      type: [RefreshTokenSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * ============================
 * Indexes
 * ============================
 */

// Fast lookup for refresh token rotation
UserSchema.index({ "refreshTokens.tokenHash": 1 });

// Optional: auto-clean expired refresh tokens (MongoDB TTL does NOT work on arrays)
// This is handled at application level instead.

/**
 * ============================
 * Model
 * ============================
 */

export const UserModel =
  mongoose.models.User ||
  mongoose.model<UserDocument>("User", UserSchema);
