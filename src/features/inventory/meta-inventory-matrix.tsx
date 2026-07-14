import type { InventoryPage, MetaSignal } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHostname } from "@/lib/format";

const metaSignals: MetaSignal[] = ["Title", "Description", "OpenGraph", "Twitter Card", "Robots", "Canonical"];

function getMetaSignalLabel(signal: MetaSignal) {
  const labels: Record<MetaSignal, string> = { Title: "标题", Description: "描述", OpenGraph: "OpenGraph", "Twitter Card": "Twitter 卡片", Robots: "Robots", Canonical: "规范链接" };
  return labels[signal];
}

function getMetaStatusLabel(value: "Present" | "Missing" | "Warning") {
  const labels = { Present: "已配置", Missing: "缺少", Warning: "需检查" };
  return labels[value];
}

function getPageTypeLabel(type: string) {
  const labels: Record<string, string> = { Homepage: "首页", Product: "产品页", Blog: "博客", Docs: "文档", Pricing: "价格页", Legal: "法律页面", Landing: "落地页" };
  return labels[type] ?? type;
}

function metaVariant(value: "Present" | "Missing" | "Warning") {
  if (value === "Present") return "success";
  if (value === "Warning") return "warning";
  return "outline";
}

export function MetaInventoryMatrix({ pages }: { pages: InventoryPage[] }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>元信息</CardTitle>
        <p className="text-sm text-muted-foreground">标题、描述、社交卡片、Robots 和规范链接覆盖情况。</p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="min-w-[880px]">
          <div className="grid grid-cols-7 border-y border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>页面</span>{metaSignals.map((signal) => <span key={signal}>{getMetaSignalLabel(signal)}</span>)}
          </div>
          {pages.slice(0, 7).map((page) => (
            <div key={page.id} className="grid grid-cols-7 items-center gap-3 border-b border-white/5 px-5 py-4 text-sm hover:bg-white/[0.03]">
              <div className="min-w-0"><p className="truncate font-medium">{getPageTypeLabel(page.pageType)}</p><p className="truncate text-xs text-muted-foreground">{getHostname(page.url)}</p></div>
              {metaSignals.map((signal) => <Badge key={signal} variant={metaVariant(page.meta[signal])}>{getMetaStatusLabel(page.meta[signal])}</Badge>)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
