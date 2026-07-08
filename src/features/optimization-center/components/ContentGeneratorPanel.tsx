"use client";

import { FileText } from "lucide-react";
import type { GeneratedContent } from "@/features/optimization-center/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ContentGeneratorPanel({ items }: { items: GeneratedContent[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("optimization.contentGenerator")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("optimization.mockAi")}</p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-xl bg-primary/10 p-2"><FileText className="h-4 w-4 text-primary" /></div>
              <Badge variant="outline">{item.type}</Badge>
            </div>
            <h3 className="mt-4 font-medium">{item.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{item.content}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
