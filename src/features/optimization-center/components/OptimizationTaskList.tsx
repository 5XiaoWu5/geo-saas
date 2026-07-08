"use client";

import { CheckCircle2, CircleDot } from "lucide-react";
import type { OptimizationTask } from "@/features/optimization-center/types";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function priorityVariant(priority: OptimizationTask["priority"]) {
  if (priority === "High") return "outline";
  if (priority === "Medium") return "warning";
  return "muted";
}

export function OptimizationTaskList({ tasks }: { tasks: OptimizationTask[] }) {
  const { t } = useI18n();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>{t("optimization.taskGenerator")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {task.status === "Done" ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <CircleDot className="h-4 w-4 text-primary" />}
                  <h3 className="font-medium">{task.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge variant="outline">{task.source}</Badge>
                <Badge variant={priorityVariant(task.priority)}>{t("optimization.priority")}: {task.priority}</Badge>
                <Badge variant="success">+{task.estimatedLift}</Badge>
                <Badge variant={task.status === "Done" ? "success" : "muted"}>{task.status}</Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
