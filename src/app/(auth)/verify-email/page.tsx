import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { VerifyEmailForm } from "@/features/auth/components/VerifyEmailForm";

export default function VerifyEmailPage() {
  return <AuthShell title="Verify email" description="Enter the 6-digit code sent to your inbox."><Suspense><VerifyEmailForm /></Suspense></AuthShell>;
}
