"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const tabs = [
  { labelKey: "projects.overview", path: "overview" },
  { labelKey: "nav.growthDashboard", path: "growth/overview" },
  { labelKey: "nav.seoGrowth", path: "seo" },
  { labelKey: "nav.geoGrowth", path: "geo" },
  { labelKey: "nav.knowledge", path: "knowledge" },
  { labelKey: "nav.competitors", path: "competitors" },
  { labelKey: "nav.optimization", path: "optimization" },
  { labelKey: "nav.growthActions", path: "growth/actions" },
  { labelKey: "nav.growthAgent", path: "growth/agent" },
  { labelKey: "nav.automation", path: "automation" },
  { labelKey: "nav.growthReports", path: "reports" },
];

export function ProjectTabs() {
  const pathname = usePathname();
  const { project } = useProject();
  const { t } = useI18n();

  if (tabs.length <= 1) return null;

  return (
    <nav aria-label="项目工作区" className="max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-1">
      <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {tabs.map((tab) => {
          const href = `/projects/${project.id}/${tab.path}`;
          const active = pathname === href || pathname.startsWith(`${href}/`) || (tab.path === "overview" && pathname === `/projects/${project.id}`);
          return (
            <Link key={tab.path} href={href} aria-current={active ? "page" : undefined} className={cn("min-h-11 shrink-0 snap-start whitespace-nowrap rounded-xl px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}>
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
