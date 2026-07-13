"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, UserRound } from "lucide-react";
import { AuthAlert, AuthField, AuthSubmitButton, PasswordField } from "@/features/auth/components/AuthFormControls";
import { Turnstile } from "@/features/auth/components/Turnstile";
import { AUTH_TURNSTILE_ENABLED } from "@/features/auth/components/feature-flags";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (AUTH_TURNSTILE_ENABLED && !turnstileToken) {
      setError("请先完成人机验证");
      return;
    }

    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? "").trim(),
          email,
          password: String(formData.get("password") ?? ""),
          turnstileToken,
        }),
      });
      const result = (await response.json()) as { error?: string; emailDelivery?: { sent: boolean; error?: string | null } };
      if (!response.ok) {
        setTurnstileToken("");
        setError(result.error ?? "创建账户失败，请稍后重试");
        return;
      }
      router.replace(`/verify-email?email=${encodeURIComponent(email)}${result.emailDelivery?.sent === false ? "&emailStatus=failed" : ""}`);
    } catch {
      setTurnstileToken("");
      setError("网络连接异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <AuthField id="name" name="name" label="你的名称" autoComplete="name" required icon={<UserRound className="h-4 w-4" />} placeholder="例如：王小明" />
      <AuthField id="email" name="email" label="工作邮箱" type="email" autoComplete="email" required icon={<Mail className="h-4 w-4" />} placeholder="you@company.com" />
      <PasswordField id="password" label="设置密码" autoComplete="new-password" />
      {AUTH_TURNSTILE_ENABLED ? <Turnstile onVerify={setTurnstileToken} /> : null}
      {error ? <AuthAlert type="error">{error}</AuthAlert> : null}
      <AuthSubmitButton loading={loading} loadingText="正在创建账户并发送邮箱验证码...">开启 GEO 增长工作空间</AuthSubmitButton>
    </form>
  );
}
