"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthAlert, AuthField, AuthSubmitButton } from "@/features/auth/components/AuthFormControls";

export function VerifyEmailForm() {
  const initialEmail = useSearchParams().get("email") ?? "";
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: formData.get("email"), code: formData.get("code") }) });
    const result = await response.json() as { error?: string };
    setLoading(false);
    if (!response.ok) { setError(result.error ?? "邮箱验证失败，请稍后重试"); return; }
    setVerified(true);
    setMessage("邮箱验证成功，你现在可以进入 GeoPilot AI。");
  }

  async function resend(email: string) {
    setResending(true);
    setError("");
    const response = await fetch("/api/auth/send-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const result = await response.json() as { error?: string };
    setResending(false);
    if (!response.ok) { setError(result.error ?? "重新发送验证码失败，请稍后重试"); return; }
    setMessage("新的邮箱验证码已发送，请查看收件箱。");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <AuthField id="email" name="email" label="工作邮箱" type="email" defaultValue={initialEmail} required icon={<Mail className="h-4 w-4" />} placeholder="you@company.com" />
      <AuthField id="code" name="code" label="六位验证码" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required icon={<BadgeCheck className="h-4 w-4" />} placeholder="请输入邮箱验证码" className="tracking-[0.35em]" />
      {error ? <AuthAlert type="error">{error}</AuthAlert> : null}
      {message ? <AuthAlert type="success">{message} {verified ? <Link href="/login" className="font-medium underline underline-offset-4">立即登录</Link> : null}</AuthAlert> : null}
      <AuthSubmitButton loading={loading} loadingText="正在验证邮箱...">完成邮箱验证</AuthSubmitButton>
      <Button type="button" variant="outline" disabled={resending} onClick={() => void resend((document.getElementById("email") as HTMLInputElement | null)?.value ?? initialEmail)} className="h-12 rounded-2xl border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.08]">
        {resending ? "正在发送验证码..." : "重新发送验证码"}
      </Button>
    </form>
  );
}
