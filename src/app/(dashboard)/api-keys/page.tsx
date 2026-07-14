import { KeyRound, Plus } from "lucide-react";
import { apiKeys } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page";

export default function ApiKeysPage() {
  return (
    <div>
      <PageHeader title="API ??" description="?? API ??????????????????????? API?" action={<Button><Plus className="h-4 w-4" /> ????</Button>} />
      <div className="space-y-4">
        {apiKeys.map((key) => (
          <Card key={key.prefix} className="glass-panel border-white/10">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4"><div className="rounded-2xl bg-primary/10 p-3"><KeyRound className="h-5 w-5 text-primary" /></div><div><p className="font-medium">{key.name}</p><p className="text-sm text-muted-foreground">{key.prefix}•••••••• · Created {key.created}</p></div></div>
              <span className="text-sm text-muted-foreground">?????{key.lastUsed}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
