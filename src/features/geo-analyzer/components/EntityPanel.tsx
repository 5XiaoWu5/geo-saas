"use client";

import { Building2, MapPin, ShieldCheck } from "lucide-react";
import type { EntityAnalysis } from "@/features/geo-analyzer/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EntityPanel({ entity }: { entity: EntityAnalysis }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("analyzer.entityPanel")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary p-3 text-primary-foreground"><Building2 className="h-6 w-6" /></div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">{entity.companyName}</p>
              <p className="mt-2 text-sm text-muted-foreground">{entity.brandDescription}</p>
            </div>
          </div>
        </div>
        <InfoRow label={t("analyzer.industry")} value={entity.industry} />
        <InfoRow label={t("analyzer.location")} value={entity.location} icon={<MapPin className="h-4 w-4 text-primary" />} />
        <InfoRow label={t("analyzer.contactInfo")} value={entity.contactInfo} />
        <div>
          <p className="mb-2 text-sm text-muted-foreground">{t("analyzer.products")}</p>
          <div className="flex flex-wrap gap-2">{entity.products.map((product) => <Badge key={product} variant="outline">{product}</Badge>)}</div>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">{t("analyzer.authorityProof")}</p>
          <div className="grid gap-2">{entity.authorityProof.map((proof) => <div key={proof} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"><ShieldCheck className="h-4 w-4 text-primary" />{proof}</div>)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 flex items-center gap-2 font-medium">{icon}{value}</p></div>;
}
