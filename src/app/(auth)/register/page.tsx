export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell
      title="开启你的 GEO 增长工作空间"
      description="创建企业级 AI 搜索优化工作空间，开始追踪品牌在 ChatGPT、Claude、Gemini 和 Perplexity 中的可见性。"
      footer={
        <>
          已经有工作空间？ <Link href="/login" className="text-cyan-300 hover:underline">直接登录</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
