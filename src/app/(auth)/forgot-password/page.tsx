import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return <AuthShell title="找回访问权限" description="输入注册邮箱，我们会发送一次性的安全密码重置链接。" footer={<Link href="/login" className="text-primary hover:underline">返回登录入口</Link>}><ForgotPasswordForm /></AuthShell>;
}
