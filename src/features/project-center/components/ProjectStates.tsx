import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProjectLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4", className)}>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="glass-panel h-28 animate-pulse rounded-2xl" />)}
      </div>
      <div className="glass-panel h-80 animate-pulse rounded-3xl" />
    </div>
  );
}

export function ProjectEmptyState({ title = "No project data", description = "There is no data available for this project yet." }: { title?: string; description?: string }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 h-12 w-12 rounded-2xl border border-dashed border-primary/40 bg-primary/10" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ProjectErrorState({ message = "Unable to load project data." }: { message?: string }) {
  return (
    <Card className="glass-panel border-destructive/30">
      <CardContent className="p-6">
        <h3 className="font-semibold text-destructive">Project data error</h3>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
