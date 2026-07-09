export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return <AuthShell title="????????" description="????? 8 ????????????????????"><Suspense><ResetPasswordForm /></Suspense></AuthShell>;
}
