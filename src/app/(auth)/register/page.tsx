import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return <AuthShell title="开启你的 GEO 增长工作空间" description="创建账户后，我们会发送邮箱验证码，确保企业工作空间安全启用。" footer={<>已有工作空间？ <Link href="/login" className="text-primary hover:underline">进入 GeoPilot AI</Link></>}><RegisterForm /></AuthShell>;
}
