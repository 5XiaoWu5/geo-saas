import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return <AuthShell title="进入 GeoPilot AI" description="继续监控你的 AI 搜索可见性、GEO 健康度与优化增长工作流。" footer={<>还没有工作空间？ <Link href="/register" className="text-primary hover:underline">立即开启</Link></>}><LoginForm /></AuthShell>;
}
