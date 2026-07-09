export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return <AuthShell title="进入 GeoPilot AI" description="连接你的企业工作空间，继续监控 AI 搜索可见性与 GEO 增长工作流。" footer={<>还没有工作空间？ <Link href="/register" className="text-cyan-300 hover:underline">立即开启</Link></>}><LoginForm /></AuthShell>;
}
