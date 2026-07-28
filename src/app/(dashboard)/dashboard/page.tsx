"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Globe2,
  Loader2,
  MessageSquareText,
  SearchCheck,
} from "lucide-react";
import {
  GuidedEmptyState,
  GuidedPageHeader,
  OnboardingGuide,
  TechnicalDetails,
} from "@/components/shared/guided-experience";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  OnboardingNextAction,
  ProjectOnboardingSummary,
} from "@/features/growth-engine/onboarding";
import { useI18n } from "@/i18n/provider";
import type { Project } from "@/types/project";

type DashboardState = {
  projects: Project[];
  onboarding: ProjectOnboardingSummary | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "REQUEST_FAILED");
  return body;
}

async function loadDashboard(): Promise<DashboardState> {
  const { projects } = await readJson<{ projects: Project[] }>(
    await fetch("/api/projects", { cache: "no-store" }),
  );
  const project = projects[0];
  if (!project) return { projects, onboarding: null };
  const onboarding = await readJson<ProjectOnboardingSummary>(
    await fetch(`/api/projects/${project.id}/onboarding`, { cache: "no-store" }),
  );
  return { projects, onboarding };
}

const NEXT_COPY: Record<OnboardingNextAction, [string, string]> = {
  CONNECT_PROVIDER: ["连接 AI 平台", "Connect an AI platform"],
  FIX_PROVIDER: ["修复 AI 连接", "Fix the AI connection"],
  ADD_QUERY: ["添加第一个检测问题", "Add the first check question"],
  RUN_CHECK: ["运行第一次检测", "Run the first check"],
  RETRY_CHECK: ["解决问题并重新检测", "Resolve the issue and retry"],
  REVIEW_RESULTS: ["查看检测结果", "Review check results"],
  CREATE_ACTION: ["创建第一个优化行动", "Create the first growth action"],
  START_ACTION: ["开始执行优先行动", "Start the priority action"],
  VIEW_REPORT: ["查看本周期增长报告", "Review this period’s report"],
};

function nextHref(projectId: string, action: OnboardingNextAction) {
  if (action === "CONNECT_PROVIDER" || action === "FIX_PROVIDER") {
    return `/projects/${projectId}/geo/monitoring#ai-connections`;
  }
  if (["ADD_QUERY", "RUN_CHECK", "RETRY_CHECK", "REVIEW_RESULTS"].includes(action)) {
    return `/projects/${projectId}/geo/monitoring#saved-questions`;
  }
  if (action === "CREATE_ACTION" || action === "START_ACTION") {
    return `/projects/${projectId}/growth/actions`;
  }
  return `/projects/${projectId}/reports`;
}

export default function DashboardPage() {
  const { locale, dictionary } = useI18n();
  const language = locale === "zh" ? 0 : 1;
  const [data, setData] = useState<DashboardState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void loadDashboard()
      .then(result => {
        if (active) setData(result);
      })
      .catch(requestError => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "REQUEST_FAILED");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const project = data?.projects[0] ?? null;
  const summary = data?.onboarding ?? null;
  const primary = summary
    ? {
        label: NEXT_COPY[summary.nextAction][language],
        href: nextHref(summary.project.id, summary.nextAction),
      }
    : null;
  const metrics = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: locale === "zh" ? "已完成 AI 检测" : "Completed AI checks",
        value: summary.facts.succeededResultCount,
        detail: locale === "zh" ? "来自真实 AISearchResult" : "From real AISearchResult records",
        icon: SearchCheck,
      },
      {
        label: locale === "zh" ? "品牌被提及" : "Brand mentions",
        value: summary.facts.mentionedResultCount,
        detail: locale === "zh" ? "成功回答中的真实提及" : "Real mentions in successful answers",
        icon: MessageSquareText,
      },
      {
        label: locale === "zh" ? "需要处理的问题" : "Issues to address",
        value: summary.facts.openRecommendationCount,
        detail: locale === "zh" ? "尚未完成的优化任务" : "Open optimization tasks",
        icon: CircleDot,
      },
      {
        label: locale === "zh" ? "本周期已完成行动" : "Completed actions",
        value: summary.facts.completedActionCount,
        detail: locale === "zh" ? "已完成或已验证的行动" : "Completed or verified actions",
        icon: CheckCircle2,
      },
    ];
  }, [locale, summary]);

  if (!data && !error) {
    return (
      <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
        {locale === "zh" ? "正在读取企业增长状态…" : "Loading company growth status…"}
      </div>
    );
  }

  if (error) {
    return (
      <GuidedEmptyState
        title={locale === "zh" ? "暂时无法读取首页状态" : "Dashboard status is unavailable"}
        reason={locale === "zh" ? "系统没有生成任何替代数据。" : "No substitute data was generated."}
        instruction={locale === "zh" ? "请刷新页面；如果问题持续，请检查服务状态。" : "Refresh the page. If the issue continues, check the service status."}
        action={<Button onClick={() => window.location.reload()} className="min-h-11">{locale === "zh" ? "重新读取首页" : "Reload dashboard"}</Button>}
      />
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <GuidedPageHeader
          title={locale === "zh" ? "首页" : "Home"}
          description={locale === "zh" ? "从一个企业项目开始建立真实的 SEO 与 AI 搜索增长记录。" : "Start with a company project to build real SEO and AI search growth records."}
          status={locale === "zh" ? "尚未创建企业项目" : "No company project yet"}
          action={<Button asChild className="min-h-11 w-full sm:w-auto"><Link href="/projects">{locale === "zh" ? "创建企业项目" : "Create company project"}<ArrowRight className="h-4 w-4" /></Link></Button>}
        />
        <GuidedEmptyState
          title={locale === "zh" ? "创建第一个企业项目" : "Create your first company project"}
          reason={locale === "zh" ? "项目用于隔离网站、企业资料、检测问题和增长结果。" : "A project keeps the website, company information, check questions, and growth results isolated."}
          instruction={locale === "zh" ? "填写企业名称和网站地址。" : "Add the company name and website address."}
          action={<Button asChild className="min-h-11"><Link href="/projects">{locale === "zh" ? "创建企业项目" : "Create company project"}</Link></Button>}
        />
      </div>
    );
  }

  if (!summary || !primary) return null;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <GuidedPageHeader
        title={locale === "zh" ? "企业增长首页" : "Company growth home"}
        description={locale === "zh" ? "快速了解当前 AI 搜索表现、最重要的问题以及现在应该做什么。" : "See current AI search performance, the most important issue, and what to do next."}
        status={summary.complete ? (locale === "zh" ? "基础设置已完成" : "Initial setup is complete") : (locale === "zh" ? "正在完成首次 AI 搜索检测" : "Setting up the first AI search check")}
        action={<Button asChild className="min-h-11 w-full sm:w-auto"><Link href={primary.href}>{primary.label}<ArrowRight className="h-4 w-4" /></Link></Button>}
      />

      <OnboardingGuide summary={summary} compact />

      <Card className="border-cyan-300/20 bg-[linear-gradient(135deg,rgba(34,211,238,.07),rgba(15,23,42,.65))]">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
              <Globe2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold">{dictionary.aiPresence.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{dictionary.aiPresence.description}</p>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/projects/${project.id}/geo/ai-presence`}>
              {dictionary.aiPresence.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={locale === "zh" ? "当前整体状态" : "Current status"}>
        {metrics.map(metric => (
          <Card key={metric.label} className="border-white/10 bg-card/70">
            <CardContent className="p-5">
              <metric.icon className="h-5 w-5 text-cyan-200" />
              <p className="mt-4 text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="overflow-hidden border-cyan-300/20 bg-[linear-gradient(135deg,rgba(34,211,238,.08),rgba(15,23,42,.8))]">
          <CardContent className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              {locale === "zh" ? "建议您现在处理" : "Recommended now"}
            </p>
            <h2 className="mt-3 text-xl font-semibold">{primary.label}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {locale === "zh"
                ? "该建议由当前项目的真实连接、问题、检测和执行记录推导。"
                : "This recommendation is derived from the project’s real connections, questions, checks, and execution records."}
            </p>
            <Button asChild className="mt-5 min-h-11 w-full sm:w-auto">
              <Link href={primary.href}>{primary.label}<ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/70">
          <CardContent className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              {locale === "zh" ? "最近完成" : "Recently completed"}
            </h2>
            {summary.recentCompletions.length ? (
              <ul className="mt-4 space-y-3">
                {summary.recentCompletions.slice(0, 4).map(item => (
                  <li key={`${item.type}:${item.id}`} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 p-3">
                    <div>
                      <p className="text-sm font-medium">{completionLabel(item.type, locale)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(item.completedAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-muted-foreground">
                {locale === "zh" ? "尚无已完成记录。完成上方推荐步骤后，这里会显示真实结果。" : "No completed record yet. Real results will appear here after the recommended step is completed."}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <TechnicalDetails>
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <p>{locale === "zh" ? "检测问题" : "Saved questions"}：{summary.facts.queryCount}</p>
          <p>{locale === "zh" ? "检测尝试" : "Check attempts"}：{summary.facts.resultCount}</p>
          <p>{locale === "zh" ? "历史报告" : "Historical reports"}：{summary.facts.reportCount}</p>
        </div>
      </TechnicalDetails>
    </div>
  );
}

function completionLabel(
  type: ProjectOnboardingSummary["recentCompletions"][number]["type"],
  locale: "zh" | "en",
) {
  const copy: Record<typeof type, [string, string]> = {
    PROVIDER: ["已连接并验证 AI 平台", "AI platform connected and verified"],
    AI_SEARCH: ["已完成 AI 搜索检测", "AI search check completed"],
    ACTION: ["已完成增长行动", "Growth action completed"],
    AUTOMATION: ["已完成自动执行", "Automation completed"],
    REPORT: ["已生成增长报告", "Growth report generated"],
  };
  return copy[type][locale === "zh" ? 0 : 1];
}
