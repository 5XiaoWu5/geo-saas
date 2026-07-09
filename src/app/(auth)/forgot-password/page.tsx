import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return <AuthShell title="Reset access" description="Enter your email and we will send a secure reset link." footer={<Link href="/login" className="text-primary hover:underline">Back to sign in</Link>}><ForgotPasswordForm /></AuthShell>;
}
