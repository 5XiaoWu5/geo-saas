"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "概览", segment: "overview" },
  { label: "GEO 分析", segment: "analyzer" },
  { label: "可见性监控", segment: "visibility" },
  { label: "优化中心", segment: "optimization" },
  { label: "趋势监控", segment: "monitoring" },
];

export function ProjectTabs() {
  const pathname = usePathname();
  const { project } = useProject();

  return (
    <div className="max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-1">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const href = `/projects/${project.id}/${tab.segment}`;
          const active = pathname === href || (tab.segment === "overview" && pathname === `/projects/${project.id}`);
          return (
            <Link key={tab.segment} href={href} className={cn("rounded-xl px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground", active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

