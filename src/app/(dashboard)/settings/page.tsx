import { Bell, Building2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page";

const settings = [
  { icon: Building2, title: "Workspace", text: "GeoPilot AI Enterprise" },
  { icon: Shield, title: "Security", text: "SSO and audit controls placeholder" },
  { icon: Bell, title: "Notifications", text: "Weekly executive summary enabled" },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Enterprise workspace settings prepared for future configuration modules." />
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          {settings.map((item) => {
            const Icon = item.icon;
            return <Card key={item.title} className="glass-panel border-white/10"><CardContent className="flex gap-4 p-5"><Icon className="h-5 w-5 text-primary" /><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.text}</p></div></CardContent></Card>;
          })}
        </div>
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Organization profile</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2"><Label>Company name</Label><Input defaultValue="GeoPilot AI Demo" /></div>
            <div className="grid gap-2"><Label>Primary domain</Label><Input defaultValue="geopilot.ai" /></div>
            <div className="grid gap-2"><Label>Region</Label><Input defaultValue="North America" /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
