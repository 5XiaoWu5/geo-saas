"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", segment: "overview" },
  { label: "GEO Analyzer", segment: "analyzer" },
  { label: "Visibility Monitor", segment: "visibility" },
  { label: "Optimization Center", segment: "optimization" },
  { label: "Monitoring", segment: "monitoring" },
];

export function ProjectTabs() {
  const pathname = usePathname();
  const { project } = useProject();

  return (
    <div className="overflow-x-auto border-b border-white/10">
      <nav className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const href = `/projects/${project.id}/${tab.segment}`;
          const active = pathname === href || (tab.segment === "overview" && pathname === `/projects/${project.id}`);

          return (
            <Link key={tab.segment} href={href} className={cn("rounded-t-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground", active && "bg-white/[0.06] text-primary ring-1 ring-white/10")}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

