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

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-panel flex min-h-[360px] flex-col items-center justify-center rounded-3xl p-8 text-center">
      <div className="mb-4 h-14 w-14 rounded-2xl border border-dashed border-primary/40 bg-primary/10" />
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
