import { z } from "zod";

export const User = z.object({
  id: z.string(),
  email: z.string(),
  password: z.string(),
});

export const verificationSchema = z.object({
  code: z.number(),
});

export const forgetPasswordSchema = z.object({
  email: z.string().email(),
});

export const passwordChangeSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    code: z.number()
})