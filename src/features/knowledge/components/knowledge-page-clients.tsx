"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";

function LoadingKnowledgeWorkspace() {
  const { t } = useI18n();
  return <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("knowledge.loading")}</div>;
}

function LoadingIntelligenceWorkspace() {
  const { t } = useI18n();
  return <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("knowledge.intelligence.loading")}</div>;
}

const DynamicKnowledgeWorkspace = dynamic(
  () => import("./knowledge-workspace").then((module) => module.KnowledgeWorkspace),
  { ssr: false, loading: LoadingKnowledgeWorkspace },
);

const DynamicKnowledgeIntelligenceWorkspace = dynamic(
  () => import("./knowledge-intelligence-workspace").then((module) => module.KnowledgeIntelligenceWorkspace),
  { ssr: false, loading: LoadingIntelligenceWorkspace },
);

export function KnowledgeProjectClient({ projectId }: { projectId: string }) {
  return <DynamicKnowledgeWorkspace projectId={projectId} />;
}

export function KnowledgeIntelligenceProjectClient({ projectId }: { projectId: string }) {
  return <DynamicKnowledgeIntelligenceWorkspace projectId={projectId} />;
}
