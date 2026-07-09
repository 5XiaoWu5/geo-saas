import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return <AuthShell title="Create account" description="Start a secure GEO SaaS workspace with email verification." footer={<>Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link></>}><RegisterForm /></AuthShell>;
}
