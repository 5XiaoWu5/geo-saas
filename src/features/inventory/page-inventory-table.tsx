"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { InventoryPage, InventorySortKey } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate, getHostname } from "@/lib/format";

const pageTypes = ["Homepage", "Product", "Blog", "Docs", "Pricing", "Legal", "Landing"];

function getPageTypeLabel(type: string) {
  const labels: Record<string, string> = { Homepage: "首页", Product: "产品页", Blog: "博客", Docs: "文档", Pricing: "价格页", Legal: "法律页面", Landing: "落地页" };
  return labels[type] ?? type;
}

function getLanguageLabel(language: string) {
  const labels: Record<string, string> = { en: "英文", zh: "中文", ja: "日语", de: "德语" };
  return labels[language.toLowerCase()] ?? language;
}

function statusVariant(statusCode: InventoryPage["statusCode"]) {
  if (statusCode >= 200 && statusCode < 300) return "success";
  if (statusCode >= 300 && statusCode < 400) return "warning";
  return "outline";
}

export function PageInventoryTable({ pages }: { pages: InventoryPage[] }) {
  const [query, setQuery] = useState("");
  const [pageType, setPageType] = useState("all");
  const [status, setStatus] = useState("all");
  const [indexable, setIndexable] = useState("all");
  const [sort, setSort] = useState<InventorySortKey>("lastCrawl");

  const filteredPages = useMemo(() => {
    return pages
      .filter((page) => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery = !normalizedQuery || [page.url, page.title, page.canonical].some((value) => value.toLowerCase().includes(normalizedQuery));
        const matchesType = pageType === "all" || page.pageType === pageType;
        const matchesStatus = status === "all" || String(page.statusCode) === status;
        const matchesIndexable = indexable === "all" || String(page.indexable) === indexable;

        return matchesQuery && matchesType && matchesStatus && matchesIndexable;
      })
      .toSorted((left, right) => {
        if (sort === "url") return left.url.localeCompare(right.url);
        if (sort === "pageType") return left.pageType.localeCompare(right.pageType);
        if (sort === "lastCrawl") return new Date(right.lastCrawl).getTime() - new Date(left.lastCrawl).getTime();
        if (sort === "indexable") return Number(right.indexable) - Number(left.indexable);
        return Number(left[sort]) - Number(right[sort]);
      });
  }, [indexable, pageType, pages, query, sort, status]);

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle>页面资产</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">包含抓取、索引状态和元数据状态的规范页面目录。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[260px_150px_130px_150px_150px]">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 URL 或标题..." className="pl-9" />
            </div>
            <Select value={pageType} onChange={(event) => setPageType(event.target.value)}>
              <option value="all">全部类型</option>{pageTypes.map((type) => <option key={type} value={type}>{getPageTypeLabel(type)}</option>)}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">全部状态</option><option value="200">200</option><option value="301">301</option><option value="302">302</option><option value="404">404</option><option value="500">500</option>
            </Select>
            <Select value={indexable} onChange={(event) => setIndexable(event.target.value)}>
              <option value="all">全部索引状态</option><option value="true">可索引</option><option value="false">不可索引</option>
            </Select>
            <Select value={sort} onChange={(event) => setSort(event.target.value as InventorySortKey)}>
              <option value="lastCrawl">最近抓取</option><option value="url">URL</option><option value="pageType">页面类型</option><option value="statusCode">状态码</option><option value="wordCount">字数</option><option value="indexable">索引</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-12 border-y border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="col-span-3">URL</span><span>类型</span><span className="col-span-2">标题</span><span>语言</span><span>状态</span><span className="col-span-2">规范链接</span><span>字数</span><span>抓取</span><span>索引</span>
          </div>
          {filteredPages.map((page) => (
            <div key={page.id} className="grid grid-cols-12 items-center gap-3 border-b border-white/5 px-5 py-4 text-sm hover:bg-white/[0.03]">
              <div className="col-span-3 min-w-0"><p className="truncate font-medium">{getHostname(page.url)}</p><p className="truncate text-xs text-muted-foreground">{page.url}</p></div>
              <Badge variant="muted">{getPageTypeLabel(page.pageType)}</Badge>
              <p className="col-span-2 line-clamp-2">{page.title}</p>
              <span className="text-muted-foreground">{getLanguageLabel(page.language)}</span>
              <Badge variant={statusVariant(page.statusCode)}>{page.statusCode}</Badge>
              <p className="col-span-2 truncate text-muted-foreground">{page.canonical}</p>
              <span>{page.wordCount.toLocaleString()}</span>
              <span className="text-muted-foreground">{formatDate(page.lastCrawl)}</span>
              <Badge variant={page.indexable ? "success" : "muted"}>{page.indexable ? "是" : "否"}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
