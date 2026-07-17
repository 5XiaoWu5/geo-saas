"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Send, Sparkles, Target, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { QueryGeneratorProject, QueryTemplate, QueryCategory } from "@/features/query-generator/types";
import { QUERY_CATEGORIES } from "@/features/query-generator/types";
import { getHostname } from "@/lib/format";

type QueryGeneratorResponse = {
  projects: QueryGeneratorProject[];
  selectedProjectId: string | null;
  templates: QueryTemplate[];
  error?: string;
};

const CATEGORY_HINTS: Record<QueryCategory, string> = {
  品牌认知: "发现用户如何问行业和品牌",
  产品推荐: "生成推荐型 AI 搜索问题",
  行业咨询: "覆盖趋势、方法论和行业知识",
  购买决策: "模拟采购前会问的问题",
  对比竞品: "覆盖品牌比较和替代方案",
  地区搜索: "发现本地化搜索机会",
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

export function QueryGeneratorWorkspace() {
  const [data, setData] = useState<QueryGeneratorResponse | null>(null);
  const [projectId, setProjectId] = useState("");
  const [categories, setCategories] = useState<QueryCategory[]>(["品牌认知", "产品推荐", "购买决策", "地区搜索"]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [importingId, setImportingId] = useState("");
  const [error, setError] = useState("");

  const loadGenerator = useCallback(async (id?: string) => {
    setError("");
    const suffix = id ? `?projectId=${encodeURIComponent(id)}` : "";
    const result = await readJson<QueryGeneratorResponse>(await fetch(`/api/query-generator${suffix}`, { cache: "no-store" }));
    setData(result);
    setProjectId(result.selectedProjectId ?? "");
  }, []);

  useEffect(() => {
    let mounted = true;
    loadGenerator()
      .catch((requestError) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "AI 问题生成器加载失败");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadGenerator]);

  const activeProject = useMemo(
    () => data?.projects.find((project) => project.id === projectId) ?? data?.projects[0] ?? null,
    [data?.projects, projectId],
  );

  function toggleCategory(category: QueryCategory) {
    setCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  async function generatePrompts() {
    if (!projectId) return;
    setGenerating(true);
    setError("");
    try {
      await readJson<{ templates: QueryTemplate[] }>(
        await fetch("/api/query-generator/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, categories }),
        }),
      );
      await loadGenerator(projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成问题失败");
    } finally {
      setGenerating(false);
    }
  }

  async function importTemplate(templateId: string) {
    setImportingId(templateId);
    setError("");
    try {
      await readJson<{ imported: Array<{ promptId: string }> }>(
        await fetch("/api/query-generator/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateIds: [templateId] }),
        }),
      );
      await loadGenerator(projectId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加入监控失败");
    } finally {
      setImportingId("");
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="AI 问题策略中心" description="正在读取真实项目和历史问题模板。" />
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在加载...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <PageHeader title="AI 问题策略中心" description="根据真实企业信息生成 GEO 检测问题，不调用外部 AI API。" />
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      </div>
    );
  }

  const projects = data?.projects ?? [];
  const templates = data?.templates ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="AI 问题策略中心" description="基于企业名称、行业、产品和地区，用规则引擎生成适合 ChatGPT / Claude / Gemini / DeepSeek 检测的真实 Prompt 模板。" />

      {error ? (
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}

      {projects.length === 0 ? (
        <Card className="glass-panel border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">还没有真实项目。创建项目后即可生成 AI 搜索问题。</p>
            <Button asChild className="mt-4">
              <Link href="/projects">前往项目</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => void loadGenerator(project.id)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${project.id === projectId ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}
              >
                {project.name}
              </button>
            ))}
          </div>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <ProjectInfoCard project={activeProject} />
            <ConfigCard categories={categories} onToggle={toggleCategory} onGenerate={() => void generatePrompts()} generating={generating} disabled={!projectId || categories.length === 0} />
          </section>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" /> 自动生成 Prompt 列表
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">还没有生成记录。选择问题类型后点击生成，系统会把结果保存为真实 QueryTemplate。</p>
              ) : (
                templates.map((template) => (
                  <TemplateRow key={template.id} template={template} importing={importingId === template.id} onImport={() => void importTemplate(template.id)} />
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ProjectInfoCard({ project }: { project: QueryGeneratorProject | null }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" /> 企业信息
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!project ? (
          <p className="text-sm text-muted-foreground">请选择项目。</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-semibold text-foreground">{project.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{getHostname(project.websiteUrl)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoPill label="行业" value={String(project.industry)} />
              <InfoPill label="市场" value={String(project.country)} />
              <InfoPill label="GEO 分数" value={`${project.geoScore}`} progress={project.geoScore} />
              <InfoPill label="AI 可见性" value={`${project.visibilityScore}`} progress={project.visibilityScore} />
            </div>
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">{project.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfigCard({ categories, onToggle, onGenerate, generating, disabled }: { categories: QueryCategory[]; onToggle: (category: QueryCategory) => void; onGenerate: () => void; generating: boolean; disabled: boolean }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wand2 className="h-5 w-5 text-primary" /> Prompt 生成配置
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUERY_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => onToggle(category)}
              className={`rounded-2xl border p-4 text-left transition ${categories.includes(category) ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">{category}</p>
                {categories.includes(category) ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{CATEGORY_HINTS[category]}</p>
            </button>
          ))}
        </div>
        <Button onClick={onGenerate} disabled={disabled || generating} className="mt-5">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 生成 Prompt
        </Button>
      </CardContent>
    </Card>
  );
}

function InfoPill({ label, value, progress }: { label: string; value: string; progress?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      {typeof progress === "number" ? <Progress value={progress} className="mt-3" /> : null}
    </div>
  );
}

function TemplateRow({ template, importing, onImport }: { template: QueryTemplate; importing: boolean; onImport: () => void }) {
  const imported = template.status === "IMPORTED";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{template.category}</Badge>
            <Badge variant={template.priority === "high" ? "success" : "muted"}>{template.priority}</Badge>
            <Badge variant={imported ? "success" : "warning"}>{imported ? "已加入监控" : "待加入"}</Badge>
          </div>
          <p className="mt-3 break-words text-base font-medium text-foreground">{template.content}</p>
          <p className="mt-2 text-sm text-muted-foreground">目标意图：{template.intent}</p>
        </div>
        <Button onClick={onImport} disabled={imported || importing} variant={imported ? "outline" : "default"} className="shrink-0">
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {imported ? "已加入" : "加入监控"}
        </Button>
      </div>
    </div>
  );
}

