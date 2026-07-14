import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function MetricCard({ label, value, delta, className }: { label: string; value: string; delta: string; className?: string }) {
  return (
    <div className={cn("glass-panel rounded-2xl p-5", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{delta}</span>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="glass-panel flex min-h-[360px] flex-col items-center justify-center rounded-3xl p-8 text-center">
      <div className="mb-4 h-14 w-14 rounded-2xl border border-dashed border-primary/40 bg-primary/10" />
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ComingSoon({
  icon,
  badge = "即将上线",
  title,
  description,
  features,
  featuresLabel,
  action,
}: {
  icon: ReactNode;
  badge?: string;
  title: string;
  description: string;
  features: string[];
  featuresLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">{icon}</div>
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{badge}</span>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {featuresLabel ? <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{featuresLabel}</p> : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <p className="text-sm text-foreground">{feature}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
