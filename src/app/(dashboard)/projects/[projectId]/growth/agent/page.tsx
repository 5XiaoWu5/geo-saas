import { Suspense } from "react";
import { GrowthAgentCenter } from "@/features/growth-agent/growth-agent-center";

export default async function GrowthAgentPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <Suspense><GrowthAgentCenter projectId={projectId} /></Suspense>; }
