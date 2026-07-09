export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return <AuthShell title="???? GEO ????" description="???????????????????????? AI Search Optimization ????" footer={<>??????? <Link href="/login" className="text-cyan-300 hover:underline">?? GeoPilot AI</Link></>}><RegisterForm /></AuthShell>;
}
