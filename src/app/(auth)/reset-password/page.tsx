import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return <AuthShell title="Set new password" description="Choose a strong password for your account."><Suspense><ResetPasswordForm /></Suspense></AuthShell>;
}
