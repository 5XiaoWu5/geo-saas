import { Suspense } from "react";
import { GrowthActionCenter } from "@/features/growth-actions/growth-action-center";

export default async function GrowthActionsPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <Suspense><GrowthActionCenter projectId={projectId} /></Suspense>; }
