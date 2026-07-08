"use client";

import { FileCode2, FileText, FileVideo, Image, Layers3, SearchCode, Waypoints } from "lucide-react";
import type { InventoryAsset, StructuredDataInventory } from "@/types/inventory";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/page";
import { Progress } from "@/components/ui/progress";

const assetIcons = { Images: Image, Videos: FileVideo, PDF: FileText, JS: FileCode2, CSS: FileCode2, Icons: Layers3, Fonts: SearchCode };

export function InventoryDashboard({ stats }: { stats: { totalPages: number; indexedPages: number; assets: number; images: number; documents: number; videos: number; structuredData: number } }) {
  const { t } = useI18n();

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
      <MetricCard label={t("inventory.totalPages")} value={String(stats.totalPages)} delta={t("inventory.inventory")} className="xl:col-span-1" />
      <MetricCard label={t("inventory.indexedPages")} value={String(stats.indexedPages)} delta={t("crawl.indexable")} className="xl:col-span-1" />
      <MetricCard label={t("inventory.assets")} value={String(stats.assets)} delta={t("inventory.allFiles")} className="xl:col-span-1" />
      <MetricCard label={t("inventory.images")} value={String(stats.images)} delta={t("inventory.media")} className="xl:col-span-1" />
      <MetricCard label={t("inventory.documents")} value={String(stats.documents)} delta="PDF" className="xl:col-span-1" />
      <MetricCard label={t("inventory.videos")} value={String(stats.videos)} delta={t("inventory.media")} className="xl:col-span-1" />
      <MetricCard label={t("inventory.structuredData")} value={String(stats.structuredData)} delta={t("inventory.schemas")} className="xl:col-span-1" />
    </section>
  );
}

export function AssetsOverview({ assets }: { assets: InventoryAsset[] }) {
  const { t } = useI18n();
  const maxCount = Math.max(...assets.map((asset) => asset.count));

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>{t("inventory.assets")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {assets.map((asset) => {
          const Icon = assetIcons[asset.type];
          return (
            <div key={asset.type} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div>
                  <div><p className="font-medium">{asset.type}</p><p className="text-xs text-muted-foreground">{asset.sizeMb.toFixed(1)} MB · {asset.issues} {t("inventory.issues")}</p></div>
                </div>
                <span className="font-semibold">{asset.count}</span>
              </div>
              <Progress value={(asset.count / maxCount) * 100} className="mt-3" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function StructuredDataOverview({ items }: { items: StructuredDataInventory[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>{t("inventory.structuredData")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const validRate = item.detected ? Math.round((item.valid / item.detected) * 100) : 0;
          return (
            <div key={item.type} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2"><Waypoints className="h-4 w-4 text-primary" /></div>
                  <div><p className="font-medium">{item.type}</p><p className="text-xs text-muted-foreground">{item.valid} {t("inventory.valid")} · {item.warnings} {t("inventory.warnings")}</p></div>
                </div>
                <span className="font-semibold">{item.detected}</span>
              </div>
              <Progress value={validRate} className="mt-3" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
