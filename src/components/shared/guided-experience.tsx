"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDashed,
  Loader2,
} from "lucide-react";
import type {
  OnboardingStepKey,
  OnboardingStepStatus,
  ProjectOnboardingSummary,
} from "@/features/growth-engine/onboarding";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function GuidedPageHeader({
  title,
  description,
  status,
  action,
}: {
  title: string;
  description: string;
  status: string;
  action?: ReactNode;
}) {
  const { locale } = useI18n();
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/70 p-5 sm:p-7">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-300 via-sky-400 to-violet-400" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          <p className="mt-4 flex items-start gap-2 text-sm">
            <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <span>
              <span className="text-muted-foreground">
                {locale === "zh" ? "当前状态：" : "Current status: "}
              </span>
              <strong className="font-medium text-foreground">{status}</strong>
            </span>
          </p>
        </div>
        {action ? <div className="w-full lg:w-auto">{action}</div> : null}
      </div>
    </section>
  );
}

export function GuidedEmptyState({
  title,
  reason,
  instruction,
  action,
}: {
  title: string;
  reason: string;
  instruction: string;
  action: ReactNode;
}) {
  const { locale } = useI18n();
  return (
    <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
        <CircleDashed className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{reason}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6">
        <strong>{locale === "zh" ? "接下来：" : "Next: "}</strong>
        {instruction}
      </p>
      <div className="mt-5 flex justify-center">{action}</div>
    </section>
  );
}

export function TechnicalDetails({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const { locale } = useI18n();
  return (
    <details className={cn("group rounded-2xl border border-white/10 bg-black/10", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm text-muted-foreground">
        {label ?? (locale === "zh" ? "查看技术详情" : "View technical details")}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="min-w-0 border-t border-white/10 p-4">{children}</div>
    </details>
  );
}

const STEP_COPY: Record<OnboardingStepKey, [string, string]> = {
  CREATE_PROJECT: ["创建企业项目", "Create a company project"],
  CONNECT_PROVIDER: ["连接 AI 平台", "Connect an AI platform"],
  ADD_QUERY: ["添加检测问题", "Add a check question"],
  RUN_CHECK: ["运行第一次检测", "Run the first check"],
  REVIEW_RECOMMENDATIONS: ["查看结果和优化建议", "Review results and recommendations"],
};

const STATUS_COPY: Record<OnboardingStepStatus, [string, string]> = {
  NOT_STARTED: ["未开始", "Not started"],
  IN_PROGRESS: ["进行中", "In progress"],
  COMPLETED: ["已完成", "Completed"],
  NEEDS_ATTENTION: ["需要处理", "Needs attention"],
};

export function OnboardingGuide({
  summary,
  compact = false,
}: {
  summary: ProjectOnboardingSummary;
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const language = locale === "zh" ? 0 : 1;
  if (compact && summary.complete) {
    return (
      <TechnicalDetails label={locale === "zh" ? "基础设置已完成 · 重新打开使用指南" : "Setup complete · Reopen guide"}>
        <OnboardingSteps summary={summary} language={language} />
      </TechnicalDetails>
    );
  }
  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(34,211,238,.08),rgba(124,58,237,.06))]">
      <div className="p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
          {locale === "zh" ? "首次使用指南" : "Getting started"}
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          {locale === "zh" ? "开始第一次 AI 搜索检测" : "Run your first AI search check"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {locale === "zh"
            ? "完成这些步骤后，您将看到品牌是否出现在 AI 回答中，以及最需要处理的问题。"
            : "Complete these steps to see whether your brand appears in AI answers and what to improve first."}
        </p>
      </div>
      <OnboardingSteps summary={summary} language={language} />
    </section>
  );
}

function OnboardingSteps({
  summary,
  language,
}: {
  summary: ProjectOnboardingSummary;
  language: 0 | 1;
}) {
  return (
    <ol className="grid border-t border-white/10 sm:grid-cols-5">
      {summary.steps.map((step, index) => {
        const Icon =
          step.status === "COMPLETED"
            ? CheckCircle2
            : step.status === "IN_PROGRESS"
              ? Loader2
              : step.status === "NEEDS_ATTENTION"
                ? AlertTriangle
                : Circle;
        return (
          <li
            key={step.key}
            className="flex min-w-0 items-start gap-3 border-b border-white/10 p-4 last:border-b-0 sm:block sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs",
                step.status === "COMPLETED" && "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
                step.status === "IN_PROGRESS" && "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
                step.status === "NEEDS_ATTENTION" && "border-amber-300/30 bg-amber-300/10 text-amber-200",
                step.status === "NOT_STARTED" && "border-white/15 text-muted-foreground",
              )}
            >
              {step.status === "COMPLETED" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className={cn("h-4 w-4", step.status === "IN_PROGRESS" && "animate-spin motion-reduce:animate-none")} />
              )}
            </div>
            <div className="min-w-0 sm:mt-3">
              <p className="text-sm font-medium">
                {index + 1}. {STEP_COPY[step.key][language]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{STATUS_COPY[step.status][language]}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
