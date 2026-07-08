"use client";

import { Braces } from "lucide-react";
import type { GeneratedSchema } from "@/features/optimization-center/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SchemaGeneratorPanel({ schemas }: { schemas: GeneratedSchema[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("optimization.schemaGenerator")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 xl:grid-cols-3">
        {schemas.map((schema) => (
          <div key={schema.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-xl bg-primary/10 p-2"><Braces className="h-4 w-4 text-primary" /></div>
              <Badge variant="outline">{schema.type}</Badge>
            </div>
            <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-black/30 p-3 text-xs leading-5 text-muted-foreground"><code>{schema.jsonLd}</code></pre>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
