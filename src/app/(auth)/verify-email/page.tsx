export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { VerifyEmailForm } from "@/features/auth/components/VerifyEmailForm";

export default function VerifyEmailPage() {
  return <AuthShell title="????????" description="????????? 6 ?????????????????"><Suspense><VerifyEmailForm /></Suspense></AuthShell>;
}
