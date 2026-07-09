export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return <AuthShell title="设置新的安全密码" description="请使用至少 8 位字符，建议包含大小写字母、数字与符号。"><Suspense><ResetPasswordForm /></Suspense></AuthShell>;
}
