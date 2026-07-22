import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsEntryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const project = (await prisma.insightSource.projectsForUser({ where: { userId: user.id } }))[0] ?? null;
  redirect(project ? `/projects/${project.id}/reports` : "/projects");
}
