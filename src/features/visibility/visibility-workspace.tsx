"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Bot, CheckCircle2, Eye, FileSearch, LinkIcon, Loader2, Plus, Radar, Target } from "lucide-react";
import type { VisibilityCampaignWithChecks, VisibilityCheck, VisibilityPrompt, VisibilityResponse } from "@/features/visibility/types";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, getHostname } from "@/lib/format";

const AI_PROVIDERS = ["ChatGPT", "Claude", "Gemini", "Perplexity", "AI Overview"];

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

function splitSourceUrls(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function VisibilityWorkspace({ initialProjectId }: { initialProjectId?: string }) {
  const [data, setData] = useState<VisibilityResponse | null>(null);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [provider, setProvider] = useState(AI_PROVIDERS[0]);
  const [answer, setAnswer] = useState("");
  const [brandMentioned, setBrandMentioned] = useState(false);
  const [mentionPosition, setMentionPosition] = useState("");
  const [sourceUrlsText, setSourceUrlsText] = useState("");
  const [score, setScore] = useState("0");
  const [loading, setLoading] = useState(true);
  const [savingKeyword, setSavingKeyword] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingCheck, setSavingCheck] = useState(false);
  const [error, setError] = useState("");

  const loadVisibility = useCallback(async (id?: string) => {
    setError("");
    const suffix = id ? `?projectId=${encodeURIComponent(id)}` : "";
    const result = await readJson<VisibilityResponse>(await fetch(`/api/visibility${suffix}`, { cache: "no-store" }));
    const nextProjectId = result.selectedProjectId ?? "";
    const nextCampaignId = result.campaigns[0]?.id ?? "";
    const nextPromptId = result.campaigns[0]?.prompts[0]?.id ?? "";

    setData(result);
    setProjectId(nextProjectId);
    setSelectedCampaignId((current) => (current && result.campaigns.some((campaign) => campaign.id === current) ? current : nextCampaignId));
    setSelectedPromptId((current) => {
      const promptExists = result.campaigns.some((campaign) => campaign.prompts.some((prompt) => prompt.id === current));
      return promptExists ? current : nextPromptId;
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    loadVisibility(initialProjectId)
      .catch((requestError) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "AI 可见性数据加载失败");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [initialProjectId, loadVisibility]);

  const selectedCampaign = useMemo(
    () => data?.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? data?.campaigns[0] ?? null,
    [data?.campaigns, selectedCampaignId],
  );
  const selectedPrompt = useMemo(
    () => selectedCampaign?.prompts.find((prompt) => prompt.id === selectedPromptId) ?? selectedCampaign?.prompts[0] ?? null,
    [selectedCampaign, selectedPromptId],
  );

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    setSavingKeyword(true);
    setError("");
    try {
      await readJson<{ campaign: VisibilityCampaignWithChecks }>(
        await fetch("/api/visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, keyword }),
        }),
      );
      setKeyword("");
      await loadVisibility(projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建监控关键词失败");
    } finally {
      setSavingKeyword(false);
    }
  }

  async function createPrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaign) return;
    setSavingPrompt(true);
    setError("");
    try {
      await readJson<{ prompt: VisibilityPrompt }>(
        await fetch("/api/visibility/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: selectedCampaign.id, prompt: newPrompt }),
        }),
      );
      setNewPrompt("");
      await loadVisibility(projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建 Prompt 失败");
    } finally {
      setSavingPrompt(false);
    }
  }

  async function saveCheck(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaign || !selectedPrompt) return;
    setSavingCheck(true);
    setError("");
    try {
      await readJson<{ check: VisibilityCheck }>(
        await fetch("/api/visibility/checks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: selectedCampaign.id,
            promptId: selectedPrompt.id,
            prompt: selectedPrompt.prompt,
            provider,
            answer,
            brandMentioned,
            mentionPosition: brandMentioned && mentionPosition ? Number(mentionPosition) : null,
            sourceUrls: splitSourceUrls(sourceUrlsText),
            score: Number(score),
          }),
        }),
      );
      setAnswer("");
      setBrandMentioned(false);
      setMentionPosition("");
      setSourceUrlsText("");
      setScore("0");
      await loadVisibility(projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存检测结果失败");
    } finally {
      setSavingCheck(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="AI 可见性监控" description="正在加载真实关键词、Prompt 和检测记录。" />
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在加载真实监控数据...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <PageHeader title="AI 可见性监控" description="用人工检测流程跟踪关键词、Prompt、AI 回答和品牌曝光，不调用外部 AI API。" />
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      </div>
    );
  }

  const projects = data?.projects ?? [];
  const activeProject = projects.find((project) => project.id === projectId) ?? projects[0] ?? null;
  const checks = data?.campaigns.flatMap((campaign) => campaign.checks) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="AI 可见性监控" description="用人工检测流程跟踪关键词在 ChatGPT、Claude、Gemini 等回答中的品牌曝光，不调用外部 AI API。" />

      {error ? (
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}

      {projects.length === 0 ? (
        <Card className="glass-panel border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">还没有项目。创建项目后即可添加 AI 可见性关键词监控。</p>
            <Button asChild className="mt-4">
              <Link href="/projects">前往项目</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={<Eye className="h-5 w-5" />} label="AI 出现次数" value={`${data?.summary.aiAppearances ?? 0}`} description={`来自 ${data?.summary.totalChecks ?? 0} 条真实检测记录`} />
            <SummaryCard icon={<Radar className="h-5 w-5" />} label="品牌出现率" value={`${data?.summary.brandMentionRate ?? 0}`} suffix="%" description="品牌出现次数 / 总检测次数" />
            <SummaryCard icon={<Target className="h-5 w-5" />} label="平均排名" value={data?.summary.averageMentionPosition ? `${data.summary.averageMentionPosition}` : "-"} description="仅统计已出现品牌的检测记录" />
            <SummaryCard icon={<FileSearch className="h-5 w-5" />} label="Prompt 数" value={`${data?.summary.totalPrompts ?? 0}`} description={`${data?.summary.totalCampaigns ?? 0} 个关键词监控`} />
          </section>

          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => void loadVisibility(project.id)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${project.id === projectId ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}
              >
                {project.name}
              </button>
            ))}
          </div>

          <Card className="glass-panel border-white/10">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground">{activeProject?.name ?? "当前项目"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{activeProject ? getHostname(activeProject.websiteUrl) : "选择项目后开始监控"}</p>
              </div>
              <Button asChild variant="outline">
                <Link href={projectId ? `/projects/${projectId}` : "/projects"}>项目详情</Link>
              </Button>
            </CardContent>
          </Card>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5 text-primary" /> 关键词列表
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(event) => void createCampaign(event)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="visibility-keyword">关键词</Label>
                    <Input id="visibility-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="例如：广州展示柜厂家" required />
                  </div>
                  <Button type="submit" disabled={savingKeyword || !projectId}>
                    {savingKeyword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 添加关键词
                  </Button>
                </form>

                <div className="mt-6 space-y-3">
                  {(data?.campaigns.length ?? 0) === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">暂无关键词。先添加一个关键词监控。</p>
                  ) : (
                    data?.campaigns.map((campaign) => (
                      <CampaignRow
                        key={campaign.id}
                        campaign={campaign}
                        active={campaign.id === selectedCampaign?.id}
                        onSelect={() => {
                          setSelectedCampaignId(campaign.id);
                          setSelectedPromptId(campaign.prompts[0]?.id ?? "");
                        }}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5 text-primary" /> Prompt 管理
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedCampaign ? (
                  <p className="text-sm text-muted-foreground">选择或创建关键词后，可以为它维护多个真实查询问题。</p>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-3 text-sm">
                      当前关键词：<span className="font-medium text-primary">{selectedCampaign.keyword}</span>
                    </div>

                    <form onSubmit={(event) => void createPrompt(event)} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="visibility-new-prompt">新增 Prompt</Label>
                        <Textarea id="visibility-new-prompt" value={newPrompt} onChange={(event) => setNewPrompt(event.target.value)} placeholder="例如：推荐广州展示柜厂家有哪些？" required />
                      </div>
                      <Button type="submit" disabled={savingPrompt}>
                        {savingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 添加 Prompt
                      </Button>
                    </form>

                    <div className="space-y-3">
                      {selectedCampaign.prompts.length === 0 ? (
                        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">暂无 Prompt。添加 Prompt 后即可记录不同 AI 的人工检测结果。</p>
                      ) : (
                        selectedCampaign.prompts.map((prompt) => (
                          <PromptRow key={prompt.id} prompt={prompt} active={prompt.id === selectedPrompt?.id} onSelect={() => setSelectedPromptId(prompt.id)} />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" /> 保存检测结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedCampaign || !selectedPrompt ? (
                <p className="text-sm text-muted-foreground">请先选择关键词并添加 Prompt，再保存 ChatGPT / Claude / Gemini 等目标 AI 的人工检测结果。</p>
              ) : (
                <form onSubmit={(event) => void saveCheck(event)} className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">检测 Prompt：</span>{selectedPrompt.prompt}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="visibility-provider">目标 AI</Label>
                      <Select id="visibility-provider" value={provider} onChange={(event) => setProvider(event.target.value)}>
                        {AI_PROVIDERS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visibility-score">可见性评分</Label>
                      <Input id="visibility-score" type="number" min={0} max={100} value={score} onChange={(event) => setScore(event.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visibility-position">出现位置</Label>
                      <Input id="visibility-position" type="number" min={1} max={100} value={mentionPosition} onChange={(event) => setMentionPosition(event.target.value)} disabled={!brandMentioned} placeholder="例如：1" />
                    </div>
                    <label className="flex min-h-10 items-center gap-2 rounded-md border border-input bg-background/60 px-3 py-2 text-sm">
                      <input type="checkbox" checked={brandMentioned} onChange={(event) => setBrandMentioned(event.target.checked)} />
                      品牌已出现
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibility-answer">AI 回答</Label>
                    <Textarea id="visibility-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="粘贴目标 AI 的真实回答；系统不会调用外部模型" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibility-sources">来源链接</Label>
                    <Textarea id="visibility-sources" value={sourceUrlsText} onChange={(event) => setSourceUrlsText(event.target.value)} placeholder="每行一个 URL，记录 AI 回答引用或推荐的来源页面" />
                  </div>
                  <Button type="submit" disabled={savingCheck}>
                    {savingCheck ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} 保存检测
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-primary" /> 检测记录
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checks.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无检测记录。保存一次检测后，这里会显示品牌出现状态、排名、来源链接和可见性评分。</p>
              ) : (
                checks.map((check) => <CheckRow key={check.id} check={check} campaign={data?.campaigns.find((campaign) => campaign.id === check.campaignId)} />)
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, suffix, description }: { icon: ReactNode; label: string; value: string; suffix?: string; description: string }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">{icon}</div>
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}{suffix ? <span className="ml-1 text-sm text-muted-foreground">{suffix}</span> : null}</p>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function CampaignRow({ campaign, active, onSelect }: { campaign: VisibilityCampaignWithChecks; active: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{campaign.keyword}</p>
          <p className="mt-1 text-xs text-muted-foreground">创建于 {formatDateTime(campaign.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{campaign.prompts.length} Prompt</Badge>
          <Badge variant={campaign.latestCheck?.brandMentioned ? "success" : "muted"}>{campaign.checks.length} 检测</Badge>
        </div>
      </div>
      <Progress value={campaign.latestCheck?.score ?? 0} className="mt-3" />
    </button>
  );
}

function PromptRow({ prompt, active, onSelect }: { prompt: VisibilityPrompt; active: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}>
      <p className="break-words text-sm font-medium text-foreground">{prompt.prompt}</p>
      <p className="mt-2 text-xs text-muted-foreground">创建于 {formatDateTime(prompt.createdAt)}</p>
    </button>
  );
}

function CheckRow({ check, campaign }: { check: VisibilityCheck; campaign?: VisibilityCampaignWithChecks }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{campaign?.keyword ?? "关键词"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{check.provider} · {formatDateTime(check.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={check.brandMentioned ? "success" : "warning"}>{check.brandMentioned ? "品牌出现" : "未出现"}</Badge>
          <Badge variant="outline">评分 {check.score}</Badge>
          {check.mentionPosition ? <Badge variant="outline">位置 {check.mentionPosition}</Badge> : null}
        </div>
      </div>
      <p className="mt-3 break-words text-sm text-muted-foreground">Prompt：{check.prompt}</p>
      <p className="mt-2 break-words text-sm text-foreground">{check.answer}</p>
      {check.sourceUrls.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {check.sourceUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-2 break-all text-xs text-primary hover:underline">
              <LinkIcon className="h-3.5 w-3.5 shrink-0" /> {url}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
