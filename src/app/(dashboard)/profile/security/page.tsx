import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/features/auth/server/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page";

export default async function ProfileSecurityPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader title="安全设置" description="管理账户验证状态与会话安全策略。" />
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> 账户安全</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-muted-foreground">邮箱</p><p className="mt-2 font-medium">{user?.email ?? "—"}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-muted-foreground">验证状态</p><div className="mt-2"><Badge variant={user?.emailVerified ? "success" : "warning"}>{user?.emailVerified ? "已验证" : "待验证"}</Badge></div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-muted-foreground">会话策略</p><p className="mt-2 font-medium">数据库会话 · 30 天</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
