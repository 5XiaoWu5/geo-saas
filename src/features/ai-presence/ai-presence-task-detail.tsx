"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Database, Loader2 } from "lucide-react";
import { GuidedPageHeader, TechnicalDetails } from "@/components/shared/guided-experience";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { AIPresenceTaskView } from "./types";

export function AIPresenceTaskDetail({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { locale, dictionary } = useI18n();
  const c = dictionary.aiPresence;
  const [task, setTask] = useState<AIPresenceTaskView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${projectId}/ai-presence/tasks/${taskId}`, { cache: "no-store" })
      .then(async response => {
        const body = await response.json() as AIPresenceTaskView & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "REQUEST_FAILED");
        if (active) setTask(body);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "REQUEST_FAILED"); });
    return () => { active = false; };
  }, [projectId, taskId]);

  if (!task && !error) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-cyan-300" /></div>;
  if (!task) return <p className="rounded-2xl border border-rose-300/20 p-4 text-sm text-rose-200">{error}</p>;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <GuidedPageHeader
        title={locale === "zh" ? "AI 收录准备证据" : "AI Presence Evidence"}
        description={locale === "zh" ? "只读查看这次任务在执行时保存的状态和证据。" : "Read the status and evidence saved when this task ran."}
        status={c.statusLabels[task.status]}
        action={<Button asChild variant="outline"><Link href={`/projects/${projectId}/geo/ai-presence`}><ArrowLeft className="h-4 w-4" />{locale === "zh" ? "返回 AI 收录准备" : "Back to AI Presence"}</Link></Button>}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetaCard icon={<CheckCircle2 className="h-4 w-4" />} label={locale === "zh" ? "证据状态" : "Evidence status"} value={task.evidenceStatus} />
        <MetaCard icon={<Database className="h-4 w-4" />} label={locale === "zh" ? "证据来源" : "Evidence source"} value={task.source} />
        <MetaCard icon={<Clock3 className="h-4 w-4" />} label={locale === "zh" ? "创建时间" : "Created"} value={new Date(task.createdAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")} />
        <MetaCard icon={<Clock3 className="h-4 w-4" />} label={locale === "zh" ? "验证时间" : "Verified"} value={task.verifiedAt ? new Date(task.verifiedAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US") : c.unavailable} />
      </section>
      <Card className="border-white/10 bg-card/65">
        <CardHeader><CardTitle>{task.evidenceSummary || c.noEvidence}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {task.targetUrl ? <p className="break-all text-sm text-muted-foreground">{task.targetUrl}</p> : null}
          {task.errorCode ? <p className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100">{task.errorCode}</p> : null}
          <TechnicalDetails label={c.technicalEvidence}>
            <pre className="max-w-full whitespace-pre-wrap break-all text-xs leading-5 text-muted-foreground">{JSON.stringify(task.evidence, null, 2)}</pre>
          </TechnicalDetails>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <Card className="border-white/10 bg-card/65"><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-3 break-words text-sm font-medium">{value}</p></CardContent></Card>;
}
