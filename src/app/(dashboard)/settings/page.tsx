"use client";

import Link from "next/link";
import { Building2, FolderOpen, ShieldCheck } from "lucide-react";
import { GuidedPageHeader } from "@/components/shared/guided-experience";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";

export default function SettingsPage() {
  const { locale } = useI18n();
  const zh = locale === "zh";
  return (
    <div className="space-y-6">
      <GuidedPageHeader
        title={zh ? "项目设置" : "Project Settings"}
        description={zh ? "企业名称、网站和行业等信息会直接影响网站分析与 AI 搜索检测。请选择项目后查看和更新真实资料。" : "Company, website, and industry details directly affect website analysis and AI search checks. Select a project to review and update real data."}
        status={zh ? "需要先选择一个项目" : "Select a project first"}
        action={<Button asChild className="min-h-11 w-full sm:w-auto"><Link href="/projects"><FolderOpen className="h-4 w-4" />{zh ? "选择项目" : "Select project"}</Link></Button>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="p-5"><Building2 className="h-5 w-5 text-cyan-300" /><h2 className="mt-4 font-semibold">{zh ? "这些资料会影响什么？" : "What do these details affect?"}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{zh ? "企业名称用于品牌提及判断，网站用于 SEO 分析，行业信息用于理解检测问题的业务场景。" : "The company name is used for brand-mention detection, the website powers SEO analysis, and the industry gives business context to check questions."}</p></CardContent></Card>
        <Card><CardContent className="p-5"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="mt-4 font-semibold">{zh ? "数据隔离" : "Data isolation"}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{zh ? "每个项目的企业资料、检测问题、结果和报告独立保存，不会与其他客户项目混用。" : "Company details, check questions, results, and reports are stored independently for every project and are never mixed with another client project."}</p></CardContent></Card>
      </div>
    </div>
  );
}
