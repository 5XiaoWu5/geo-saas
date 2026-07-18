import { z } from "zod";

export const emailSchema = z.string({ required_error: "请输入邮箱", invalid_type_error: "请输入邮箱" }).trim().toLowerCase().email("请输入有效的邮箱地址");
export const passwordSchema = z.string({ required_error: "请输入密码", invalid_type_error: "请输入密码" }).min(8, "密码至少需要 8 个字符").max(128, "密码最多 128 个字符");
export const turnstileTokenSchema = z.string({ invalid_type_error: "请先完成人机验证" }).optional().default("");

export const registerSchema = z.object({
  name: z.string({ required_error: "请输入名称", invalid_type_error: "请输入名称" }).trim().min(1, "请输入名称").max(80, "名称最多 80 个字符"),
  email: emailSchema,
  password: passwordSchema,
  turnstileToken: turnstileTokenSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "请输入密码", invalid_type_error: "请输入密码" }).min(1, "请输入密码"),
  turnstileToken: turnstileTokenSchema,
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: "重置链接无效", invalid_type_error: "重置链接无效" }).min(20, "重置链接无效"),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string({ required_error: "请输入验证码", invalid_type_error: "请输入验证码" }).regex(/^\d{6}$/, "请输入 6 位数字验证码"),
});

