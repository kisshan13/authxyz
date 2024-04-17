import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  code: z.number(),
});

export const verifyPassword = z.object({
  code: z.string().email(),
});

export const verificationSchema = z.object({
  code: z.number(),
});
