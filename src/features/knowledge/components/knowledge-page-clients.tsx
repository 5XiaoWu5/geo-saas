"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

function LoadingWorkspace() {
  return <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
}

const DynamicKnowledgeWorkspace = dynamic(
  () => import("./knowledge-workspace").then((module) => module.KnowledgeWorkspace),
  { ssr: false, loading: LoadingWorkspace },
);

const DynamicKnowledgeIntelligenceWorkspace = dynamic(
  () => import("./knowledge-intelligence-workspace").then((module) => module.KnowledgeIntelligenceWorkspace),
  { ssr: false, loading: LoadingWorkspace },
);

export function KnowledgeProjectClient({ projectId }: { projectId: string }) {
  return <DynamicKnowledgeWorkspace projectId={projectId} />;
}

export function KnowledgeIntelligenceProjectClient({ projectId }: { projectId: string }) {
  return <DynamicKnowledgeIntelligenceWorkspace projectId={projectId} />;
}
