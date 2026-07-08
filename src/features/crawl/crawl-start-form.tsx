"use client";

import type { FormEvent } from "react";
import { Globe2, Play } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CrawlStartForm({ onStart }: { onStart: (websiteUrl: string) => void }) {
  const { t } = useI18n();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();

    if (websiteUrl) {
      onStart(websiteUrl);
      event.currentTarget.reset();
    }
  }

  return (
    <Card className="glass-panel border-primary/20">
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-2">
            <Label htmlFor="crawl-url">{t("crawl.websiteUrl")}</Label>
            <div className="relative">
              <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="crawl-url" name="websiteUrl" required type="url" placeholder="https://example.com" className="pl-9" />
            </div>
          </div>
          <Button type="submit" className="h-10"><Play className="h-4 w-4" /> {t("crawl.startScan")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
