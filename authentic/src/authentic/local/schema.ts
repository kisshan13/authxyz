import { z } from "zod";

export const User = z.object({
  id: z.string(),
  email: z.string(),
  password: z.string(),
});

export const verificationSchema = z.object({
  code: z.number(),
});
