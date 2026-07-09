"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthAlert, AuthSubmitButton, PasswordField } from "@/features/auth/components/AuthFormControls";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: formData.get("password") }) });
    const result = await response.json() as { error?: string };
    setLoading(false);
    if (!response.ok) { setError(result.error ?? "重置密码失败，请稍后重试"); return; }
    setMessage("密码已更新，现在可以登录。");
  }

  if (!token) return <AuthAlert type="error">重置链接无效或已过期，请重新申请密码重置邮件。</AuthAlert>;

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <PasswordField id="password" label="新的安全密码" autoComplete="new-password" />
      {error ? <AuthAlert type="error">{error}</AuthAlert> : null}
      {message ? <AuthAlert type="success">{message} <Link href="/login" className="font-medium underline underline-offset-4">立即登录</Link></AuthAlert> : null}
      <AuthSubmitButton loading={loading} loadingText="正在更新密码...">确认重置密码</AuthSubmitButton>
    </form>
  );
}
