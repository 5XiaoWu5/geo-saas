import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";

export const dynamic = "force-dynamic";
export default async function ActionsEntryPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); const project = (await prisma.insightSource.projectsForUser({ where: { userId: user.id } }))[0] ?? null; redirect(project ? `/projects/${project.id}/growth/actions` : "/projects"); }
