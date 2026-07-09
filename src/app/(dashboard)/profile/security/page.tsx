import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/features/auth/server/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page";

export default async function ProfileSecurityPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Security" description="Manage account verification and session security." />
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Account security</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-muted-foreground">Email</p><p className="mt-2 font-medium">{user?.email ?? "—"}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-muted-foreground">Verification</p><div className="mt-2"><Badge variant={user?.emailVerified ? "success" : "warning"}>{user?.emailVerified ? "Verified" : "Pending"}</Badge></div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-muted-foreground">Session policy</p><p className="mt-2 font-medium">Database session · 30 days</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
