import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page";

export default function ProfilePage() {
  return (
    <div>
      <PageHeader title="个人资料" description="管理用户资料、账户信息与工作空间身份。" />
      <Card className="glass-panel border-white/10">
        <CardHeader className="flex-row items-center gap-4">
          <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary/15 text-lg text-primary">GP</AvatarFallback></Avatar>
          <div><CardTitle>Global Pilot</CardTitle><p className="text-sm text-muted-foreground">管理员 · 企业工作空间</p></div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>姓名</Label><Input defaultValue="Global Pilot" /></div>
          <div className="grid gap-2"><Label>邮箱</Label><Input defaultValue="admin@geopilot.ai" /></div>
          <div className="grid gap-2"><Label>角色</Label><Input defaultValue="工作空间管理员" /></div>
          <div className="grid gap-2"><Label>时区</Label><Input defaultValue="Asia/Shanghai" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
