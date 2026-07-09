import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { VerifyEmailForm } from "@/features/auth/components/VerifyEmailForm";

export default function VerifyEmailPage() {
  return <AuthShell title="验证你的工作邮箱" description="请输入发送到邮箱的 6 位验证码，完成后即可启用工作空间。"><Suspense><VerifyEmailForm /></Suspense></AuthShell>;
}
