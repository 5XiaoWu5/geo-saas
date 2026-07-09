import { z } from "zod";

export const emailSchema = z.string().email().trim().toLowerCase();
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  email: emailSchema,
  password: passwordSchema,
  turnstileToken: z.string().min(1),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  turnstileToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/),
});
