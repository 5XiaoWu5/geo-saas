"use client";

import { Library } from "lucide-react";
import type { PromptTemplate } from "@/features/visibility-monitor/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PromptTemplateLibrary({ templates }: { templates: PromptTemplate[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("visibility.promptTemplateLibrary")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <div key={template.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-xl bg-primary/10 p-2"><Library className="h-4 w-4 text-primary" /></div>
              <Badge variant="outline">{template.category}</Badge>
            </div>
            <p className="mt-4 font-medium">{template.prompt}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("visibility.intent")}: {template.intent}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
