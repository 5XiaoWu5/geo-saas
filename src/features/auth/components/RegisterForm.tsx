"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Mail, UserRound } from "lucide-react";
import { Turnstile, type TurnstileHandle } from "@/features/auth/components/Turnstile";
import { getTurnstileToken } from "@/features/auth/components/turnstile-token";
import { AuthAlert, AuthField, AuthSubmitButton, PasswordField } from "@/features/auth/components/AuthFormControls";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);

  function resetTurnstile() {
    setTurnstileToken("");
    turnstileRef.current?.reset();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const resolvedTurnstileToken = getTurnstileToken(event.currentTarget, turnstileToken);
    if (!resolvedTurnstileToken) {
      setError("请先完成人机验证，确认是你本人创建账户。");
      return;
    }

    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(formData.get("name") ?? "").trim(), email, password: String(formData.get("password") ?? ""), turnstileToken: resolvedTurnstileToken }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) { resetTurnstile(); setError(result.error ?? "创建账户失败，请稍后重试"); return; }
      router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      resetTurnstile();
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
      <Turnstile ref={turnstileRef} onVerify={setTurnstileToken} />
      {error ? <AuthAlert type="error">{error}</AuthAlert> : null}
      <AuthSubmitButton loading={loading} loadingText="正在创建安全工作区...">开启 GEO 增长工作空间</AuthSubmitButton>
    </form>
  );
}
