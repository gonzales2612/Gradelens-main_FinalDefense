import { z } from "zod";

/**
 * Shared primitives, not feature schemas
 */

export const emailSchema = z
  .string()
  .email()
  .transform((v) => v.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);
