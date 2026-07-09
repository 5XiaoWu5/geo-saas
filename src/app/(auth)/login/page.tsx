export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return <AuthShell title="?? GeoPilot AI" description="??????????????? AI ?????? GEO ??????" footer={<>???????? <Link href="/register" className="text-cyan-300 hover:underline">????</Link></>}><LoginForm /></AuthShell>;
}
