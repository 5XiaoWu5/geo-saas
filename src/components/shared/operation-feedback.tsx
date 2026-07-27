"use client";

import { AlertCircle, Ban, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export const OPERATION_STATUSES = [
  "IDLE",
  "VALIDATING",
  "ANALYZING",
  "GENERATING",
  "CREATING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type OperationStatus = (typeof OPERATION_STATUSES)[number];

const keys: Record<OperationStatus, string> = {
  IDLE: "idle",
  VALIDATING: "validating",
  ANALYZING: "analyzing",
  GENERATING: "generating",
  CREATING: "creating",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export function OperationFeedback({
  status,
  title,
  message,
  className,
}: {
  status: OperationStatus;
  title?: string;
  message?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const active = ["VALIDATING", "ANALYZING", "GENERATING", "CREATING", "RUNNING"].includes(status);
  const Icon = active ? Loader2 : status === "COMPLETED" ? CheckCircle2 : status === "FAILED" ? AlertCircle : status === "CANCELLED" ? Ban : Circle;
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-2xl border p-4 text-sm",
        status === "COMPLETED" && "border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-100",
        status === "FAILED" && "border-rose-300/25 bg-rose-300/[0.07] text-rose-100",
        status === "CANCELLED" && "border-amber-300/25 bg-amber-300/[0.07] text-amber-100",
        !["COMPLETED", "FAILED", "CANCELLED"].includes(status) && "border-violet-300/20 bg-violet-300/[0.06]",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active && "animate-spin motion-reduce:animate-none")} />
      <div className="min-w-0">
        <p className="font-medium">{title ?? t(`operationFeedback.${keys[status]}`)}</p>
        {message ? <p className="mt-1 break-words text-xs leading-5 opacity-80">{message}</p> : null}
      </div>
    </div>
  );
}
