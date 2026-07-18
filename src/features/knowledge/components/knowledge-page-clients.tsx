"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { KnowledgeWorkspace } from "./knowledge-workspace";
import { KnowledgeIntelligenceWorkspace } from "./knowledge-intelligence-workspace";

function LoadingKnowledgeWorkspace() {
  const { t } = useI18n();
  return <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("knowledge.loading")}</div>;
}

function LoadingIntelligenceWorkspace() {
  const { t } = useI18n();
  return <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("knowledge.intelligence.loading")}</div>;
}

export function KnowledgeProjectClient({ projectId }: { projectId: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <KnowledgeWorkspace projectId={projectId} /> : <LoadingKnowledgeWorkspace />;
}

export function KnowledgeIntelligenceProjectClient({ projectId }: { projectId: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <KnowledgeIntelligenceWorkspace projectId={projectId} /> : <LoadingIntelligenceWorkspace />;
}
