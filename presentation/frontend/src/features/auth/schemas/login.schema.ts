import { emailSchema, passwordSchema } from "@/lib/validators";
import { z } from "zod";

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;
