import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProjectLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />)}
    </div>
  );
}

export function ProjectEmptyState({ title = "暂无项目数据", description = "当前项目还没有可展示的数据。" }: { title?: string; description?: string }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="p-8 text-center"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{description}</p></CardContent>
    </Card>
  );
}

export function ProjectErrorState({ message = "项目数据加载失败。" }: { message?: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/10">
      <CardContent className="flex gap-3 p-5 text-sm text-destructive"><AlertCircle className="h-5 w-5" /><div><h3 className="font-semibold">项目数据异常</h3><p>{message}</p></div></CardContent>
    </Card>
  );
}
