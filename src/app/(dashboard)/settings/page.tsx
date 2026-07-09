import { Bell, Building2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page";

const settings = [
  { icon: Building2, title: "工作空间", text: "GeoPilot AI 企业版" },
  { icon: Shield, title: "安全设置", text: "预留单点登录与审计控制" },
  { icon: Bell, title: "通知", text: "已启用每周管理摘要" },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="设置" description="企业工作空间设置，已为后续配置模块预留。" />
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          {settings.map((item) => {
            const Icon = item.icon;
            return <Card key={item.title} className="glass-panel border-white/10"><CardContent className="flex gap-4 p-5"><Icon className="h-5 w-5 text-primary" /><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.text}</p></div></CardContent></Card>;
          })}
        </div>
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>组织资料</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2"><Label>公司名称</Label><Input defaultValue="GeoPilot AI Demo" /></div>
            <div className="grid gap-2"><Label>主域名</Label><Input defaultValue="geopilot.ai" /></div>
            <div className="grid gap-2"><Label>区域</Label><Input defaultValue="北美" /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
