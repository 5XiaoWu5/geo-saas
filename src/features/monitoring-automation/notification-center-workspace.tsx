"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bell, CheckCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NotificationView } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "请求失败");
  return body;
}

export function NotificationCenterWorkspace({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<NotificationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await readJson<{ notifications: NotificationView[] }>(await fetch(`/api/notifications/${projectId}`, { cache: "no-store" }));
      setItems(result.notifications); setError("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "通知加载失败"); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  async function markRead(notificationId?: string) {
    setSaving(true);
    try {
      await readJson(await fetch(`/api/notifications/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notificationId ? { notificationId } : {}) }));
      setItems((current) => current.map((item) => notificationId && item.id !== notificationId ? item : { ...item, isRead: true }));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "通知状态更新失败"); }
    finally { setSaving(false); }
  }
  return <div className="min-w-0 space-y-6 overflow-x-hidden">
    <PageHeader title="Notification Center" description="汇总真实 AI 搜索可见性、引用、排名变化与 Provider 失败事件。" action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="min-h-11"><Link href={`/projects/${projectId}/geo/monitoring-center`}><ArrowLeft className="h-4 w-4" />返回监控中心</Link></Button><Button className="min-h-11" disabled={saving || !items.some((item) => !item.isRead)} onClick={() => void markRead()}><CheckCheck className="h-4 w-4" />全部已读</Button></div>} />
    {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
    <Card className="glass-panel border-white/10"><CardContent className="p-4">
      {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在读取站内通知…</div> : items.length ? <div className="space-y-3">{items.map((item) => <article key={item.id} className={`min-w-0 rounded-2xl border p-4 ${item.isRead ? "border-white/10 bg-white/[0.02]" : "border-amber-300/25 bg-amber-300/[0.04]"}`}><div className="flex flex-wrap items-center gap-2"><Badge variant={item.level === "HIGH" ? "warning" : "outline"}>{item.level}</Badge><Badge variant={item.isRead ? "muted" : "success"}>{item.isRead ? "已读" : "未读"}</Badge><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("zh-CN")}</span></div><h2 className="mt-3 break-words font-semibold">{item.title}</h2><p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{item.content}</p><div className="mt-4 flex flex-wrap gap-2">{item.optimizationTaskId ? <Button asChild variant="outline" className="min-h-11"><Link href={`/projects/${projectId}/optimization`}>查看优化任务</Link></Button> : null}{!item.isRead ? <Button variant="ghost" className="min-h-11" disabled={saving} onClick={() => void markRead(item.id)}>标记已读</Button> : null}</div></article>)}</div> : <div className="flex min-h-48 flex-col items-center justify-center text-center text-sm text-muted-foreground"><Bell className="mb-3 h-6 w-6" />暂无真实监控事件通知。</div>}
    </CardContent></Card>
  </div>;
}
