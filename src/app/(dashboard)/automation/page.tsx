import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";

export default async function AutomationRedirectPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); const projects = await prisma.project.findMany({ where: { userId: user.id } }); if (!projects[0]) redirect("/projects"); redirect(`/projects/${projects[0].id}/automation`); }
