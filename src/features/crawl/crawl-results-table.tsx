"use client";

import { useMemo, useState } from "react";
import { FileSearch, Search } from "lucide-react";
import type { CrawlPageResult, CrawlResultSortKey } from "@/types/crawl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getHostname } from "@/lib/format";
import { useI18n } from "@/i18n/provider";

function statusTone(statusCode: CrawlPageResult["statusCode"]) {
  if (statusCode !== null && statusCode >= 200 && statusCode < 300) return "success";
  if (statusCode !== null && statusCode >= 300 && statusCode < 400) return "warning";
  return "outline";
}

export function CrawlResultsTable({ pages }: { pages: CrawlPageResult[] }) {
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CrawlResultSortKey>("title");

  const filteredPages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return pages
      .filter(page => !normalizedQuery || [page.url, page.title, page.metaDescription, page.h1].some(value => value.toLowerCase().includes(normalizedQuery)))
      .toSorted((left, right) => {
        if (sort === "title") return left.title.localeCompare(right.title);
        if (sort === "indexable") return Number(right.indexable ?? false) - Number(left.indexable ?? false);
        return Number(left[sort] ?? Number.MAX_SAFE_INTEGER) - Number(right[sort] ?? Number.MAX_SAFE_INTEGER);
      });
  }, [pages, query, sort]);

  return (
    <Card className="glass-panel min-w-0 border-white/10">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>{locale === "zh" ? "真实扫描结果" : "Persisted scan results"}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {locale === "zh"
                ? "只展示 WebsiteScan 已保存字段；未采集的状态码、字数和索引信息显示 unavailable。"
                : "Only persisted WebsiteScan fields are shown. Uncollected status, word-count, and index data is unavailable."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,260px)_150px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={event => setQuery(event.target.value)} placeholder={locale === "zh" ? "搜索页面" : "Search pages"} className="min-h-11 pl-9" />
            </div>
            <Select className="min-h-11" value={sort} onChange={event => setSort(event.target.value as CrawlResultSortKey)}>
              <option value="title">{locale === "zh" ? "按标题" : "Title"}</option>
              <option value="statusCode">{locale === "zh" ? "按状态码" : "Status code"}</option>
              <option value="wordCount">{locale === "zh" ? "按字数" : "Word count"}</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3 lg:grid-cols-2">
        {filteredPages.map(page => (
          <article key={page.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex min-w-0 items-start gap-3">
              <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium">{getHostname(page.url)}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{page.url}</p>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Field label={locale === "zh" ? "标题" : "Title"} value={page.title} />
              <Field label={locale === "zh" ? "描述" : "Description"} value={page.metaDescription} />
              <Field label="H1" value={page.h1} />
              <Field label={locale === "zh" ? "语言" : "Language"} value={page.language ?? "unavailable"} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={statusTone(page.statusCode)}>{locale === "zh" ? "状态" : "Status"}：{page.statusCode ?? "unavailable"}</Badge>
              <Badge variant="outline">{locale === "zh" ? "字数" : "Words"}：{page.wordCount ?? "unavailable"}</Badge>
              <Badge variant={page.indexable === true ? "success" : "muted"}>{locale === "zh" ? "索引" : "Index"}：{page.indexable === null ? "unavailable" : page.indexable ? (locale === "zh" ? "是" : "Yes") : (locale === "zh" ? "否" : "No")}</Badge>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>;
}
