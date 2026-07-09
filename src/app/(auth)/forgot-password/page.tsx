export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return <AuthShell title="??????????" description="?????????????????????????" footer={<Link href="/login" className="text-cyan-300 hover:underline">??????</Link>}><ForgotPasswordForm /></AuthShell>;
}
