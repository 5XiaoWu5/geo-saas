export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return <AuthShell title="开启企业 GEO 工作空间" description="创建账户后，我们会发送邮箱验证码，帮助你安全启用 AI 搜索优化工作区。" footer={<>已有工作空间？ <Link href="/login" className="text-cyan-300 hover:underline">进入 GeoPilot AI</Link></>}><RegisterForm /></AuthShell>;
}
