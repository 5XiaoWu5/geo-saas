import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page";

export default function ProfilePage() {
  return (
    <div>
      <PageHeader title="Profile" description="User profile shell with editable fields and account metadata." />
      <Card className="glass-panel border-white/10">
        <CardHeader className="flex-row items-center gap-4">
          <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary/15 text-lg text-primary">GP</AvatarFallback></Avatar>
          <div><CardTitle>Global Pilot</CardTitle><p className="text-sm text-muted-foreground">Administrator · Enterprise workspace</p></div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>Full name</Label><Input defaultValue="Global Pilot" /></div>
          <div className="grid gap-2"><Label>Email</Label><Input defaultValue="admin@geopilot.ai" /></div>
          <div className="grid gap-2"><Label>Role</Label><Input defaultValue="Workspace Admin" /></div>
          <div className="grid gap-2"><Label>Timezone</Label><Input defaultValue="Asia/Shanghai" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
