import type { InventoryPage, MetaSignal } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHostname } from "@/lib/format";

const metaSignals: MetaSignal[] = ["Title", "Description", "OpenGraph", "Twitter Card", "Robots", "Canonical"];

function metaVariant(value: "Present" | "Missing" | "Warning") {
  if (value === "Present") return "success";
  if (value === "Warning") return "warning";
  return "outline";
}

export function MetaInventoryMatrix({ pages }: { pages: InventoryPage[] }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>Meta</CardTitle>
        <p className="text-sm text-muted-foreground">Title, description, social cards, robots, and canonical coverage.</p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="min-w-[880px]">
          <div className="grid grid-cols-7 border-y border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Page</span>{metaSignals.map((signal) => <span key={signal}>{signal}</span>)}
          </div>
          {pages.slice(0, 7).map((page) => (
            <div key={page.id} className="grid grid-cols-7 items-center gap-3 border-b border-white/5 px-5 py-4 text-sm hover:bg-white/[0.03]">
              <div className="min-w-0"><p className="truncate font-medium">{page.pageType}</p><p className="truncate text-xs text-muted-foreground">{getHostname(page.url)}</p></div>
              {metaSignals.map((signal) => <Badge key={signal} variant={metaVariant(page.meta[signal])}>{page.meta[signal]}</Badge>)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
