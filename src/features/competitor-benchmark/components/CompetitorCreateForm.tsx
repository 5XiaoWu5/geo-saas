"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";
import type { CompetitorProfile } from "../types";

async function responseJson<T>(response: Response) {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "REQUEST_FAILED");
  return data;
}

export function CompetitorCreateForm({ projectId, onCreated }: { projectId: string; onCreated: (competitor: CompetitorProfile) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await responseJson<{ competitor: CompetitorProfile }>(await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name, domain, industry, region }),
      }));
      onCreated(result.competitor);
      setName("");
      setDomain("");
      setIndustry("");
      setRegion("");
    } catch (requestError) {
      const code = requestError instanceof Error ? requestError.message : "REQUEST_FAILED";
      const translated = t(`competitors.errors.${code}`);
      setError(translated === `competitors.errors.${code}` ? t("competitors.errors.REQUEST_FAILED") : translated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="pb-4"><CardTitle className="text-lg">{t("competitors.addTitle")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="competitor-name">{t("competitors.name")}</Label><Input id="competitor-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("competitors.namePlaceholder")} maxLength={160} required /></div>
          <div className="space-y-2"><Label htmlFor="competitor-domain">{t("competitors.domain")}</Label><Input id="competitor-domain" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder={t("competitors.domainPlaceholder")} maxLength={500} required /></div>
          <div className="space-y-2"><Label htmlFor="competitor-industry">{t("competitors.industry")}</Label><Input id="competitor-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder={t("competitors.industryPlaceholder")} maxLength={160} /></div>
          <div className="space-y-2"><Label htmlFor="competitor-region">{t("competitors.region")}</Label><Input id="competitor-region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder={t("competitors.regionPlaceholder")} maxLength={160} /></div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2"><Button type="submit" className="w-full sm:w-auto" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{saving ? t("competitors.adding") : t("competitors.add")}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
