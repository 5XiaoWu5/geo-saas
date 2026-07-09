"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { AuthAlert, AuthField, AuthSubmitButton } from "@/features/auth/components/AuthFormControls";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(formData.get("email") ?? "").trim().toLowerCase() }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "发送重置邮件失败，请稍后重试");
        return;
      }
      setMessage("如果该邮箱已注册，密码重置邮件已发送，请前往邮箱查看。");
    } catch {
      setError("发送重置邮件失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <AuthField id="email" name="email" label="注册邮箱" type="email" autoComplete="email" required icon={<Mail className="h-4 w-4" />} placeholder="you@company.com" />
      {error ? <AuthAlert type="error">{error}</AuthAlert> : null}
      {message ? <AuthAlert type="success">{message}</AuthAlert> : null}
      <AuthSubmitButton loading={loading} loadingText="正在发送安全邮件...">发送密码重置邮件</AuthSubmitButton>
    </form>
  );
}