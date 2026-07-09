import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return <AuthShell title="Sign in" description="Access your GeoPilot AI workspace securely." footer={<>No account? <Link href="/register" className="text-primary hover:underline">Create one</Link></>}><LoginForm /></AuthShell>;
}
