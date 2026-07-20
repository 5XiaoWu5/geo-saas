import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type GrowthEngineModule = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status?: "live" | "foundation" | "planned";
};

type GrowthEngineHubProps = {
  eyebrow: string;
  title: string;
  description: string;
  accent: "seo" | "geo";
  modules: GrowthEngineModule[];
};

const accentStyles = {
  seo: {
    glow: "from-emerald-400/20 via-cyan-400/10 to-transparent",
    rail: "bg-emerald-400",
    icon: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    hover: "hover:border-emerald-400/30",
  },
  geo: {
    glow: "from-violet-500/20 via-cyan-400/10 to-transparent",
    rail: "bg-violet-400",
    icon: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    hover: "hover:border-violet-400/30",
  },
} as const;

const statusLabels = {
  live: "可用",
  foundation: "基础能力",
  planned: "规划中",
} as const;

export function GrowthEngineHub({ eyebrow, title, description, accent, modules }: GrowthEngineHubProps) {
  const styles = accentStyles[accent];

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${styles.glow}`} />
        <div className={`absolute inset-y-6 left-0 w-1 rounded-r-full ${styles.rail}`} />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          const status = module.status ?? "live";
          return (
            <Link key={`${module.title}-${module.href}`} href={module.href} className="group min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <Card className={`glass-panel h-full overflow-hidden border-white/10 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06] ${styles.hover}`}>
                <CardContent className="flex h-full min-h-48 flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${styles.icon}`}><Icon className="h-5 w-5" /></span>
                    <Badge variant={status === "live" ? "success" : status === "foundation" ? "warning" : "muted"}>
                      {status === "live" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <CircleDashed className="mr-1 h-3 w-3" />}{statusLabels[status]}
                    </Badge>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold tracking-tight">{module.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{module.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">进入工作区 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
