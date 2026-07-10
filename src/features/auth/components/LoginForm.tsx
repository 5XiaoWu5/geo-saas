"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";
import { AuthAlert, AuthField, AuthSubmitButton, PasswordField } from "@/features/auth/components/AuthFormControls";
import { Turnstile } from "@/features/auth/components/Turnstile";
import { AUTH_TURNSTILE_ENABLED } from "@/features/auth/components/feature-flags";

export function LoginForm() {
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

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") ?? "").trim().toLowerCase(),
          password: String(formData.get("password") ?? ""),
          turnstileToken,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setTurnstileToken("");
        setError(result.error ?? `登录失败（${response.status}）`);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setTurnstileToken("");
      setError(err instanceof Error ? err.message : "网络连接异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <AuthField id="email" name="email" label="工作邮箱" type="email" autoComplete="email" required icon={<Mail className="h-4 w-4" />} placeholder="you@company.com" />
      <PasswordField id="password" label="账户密码" action={<Link href="/forgot-password" className="text-xs text-primary transition hover:text-cyan-300">忘记密码？</Link>} />
      {AUTH_TURNSTILE_ENABLED ? <Turnstile onVerify={setTurnstileToken} /> : null}
      {error ? <AuthAlert type="error">{error}</AuthAlert> : null}
      <AuthSubmitButton loading={loading} loadingText="正在进入工作空间...">进入 GeoPilot AI</AuthSubmitButton>
    </form>
  );
}
