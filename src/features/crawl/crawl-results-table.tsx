"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CrawlPageResult, CrawlResultSortKey } from "@/types/crawl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getHostname } from "@/lib/format";

function statusTone(statusCode: CrawlPageResult["statusCode"]) {
  if (statusCode >= 200 && statusCode < 300) return "success";
  if (statusCode >= 300 && statusCode < 400) return "warning";
  return "outline";
}

export function CrawlResultsTable({ pages }: { pages: CrawlPageResult[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [indexableFilter, setIndexableFilter] = useState("all");
  const [sort, setSort] = useState<CrawlResultSortKey>("depth");

  const filteredPages = useMemo(() => {
    return pages
      .filter((page) => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery = !normalizedQuery || [page.url, page.title, page.metaDescription, page.h1].some((value) => value.toLowerCase().includes(normalizedQuery));
        const matchesStatus = statusFilter === "all" || String(page.statusCode) === statusFilter;
        const matchesIndexable = indexableFilter === "all" || String(page.indexable) === indexableFilter;

        return matchesQuery && matchesStatus && matchesIndexable;
      })
      .toSorted((left, right) => {
        if (sort === "title") return left.title.localeCompare(right.title);
        if (sort === "indexable") return Number(right.indexable) - Number(left.indexable);
        return Number(left[sort]) - Number(right[sort]);
      });
  }, [indexableFilter, pages, query, sort, statusFilter]);

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle>Crawl Result</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">Mock page list with metadata fields ready for a future crawler data source.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[260px_150px_150px_150px]">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages..." className="pl-9" />
            </div>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All status</option><option value="200">200</option><option value="301">301</option><option value="302">302</option><option value="404">404</option><option value="500">500</option>
            </Select>
            <Select value={indexableFilter} onChange={(event) => setIndexableFilter(event.target.value)}>
              <option value="all">All indexability</option><option value="true">Indexable</option><option value="false">Not indexable</option>
            </Select>
            <Select value={sort} onChange={(event) => setSort(event.target.value as CrawlResultSortKey)}>
              <option value="depth">Depth</option><option value="title">Title</option><option value="statusCode">Status Code</option><option value="wordCount">Word Count</option><option value="indexable">Indexable</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-12 border-y border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="col-span-3">Page</span><span className="col-span-2">Title</span><span className="col-span-2">Meta Description</span><span>H1</span><span>Lang</span><span>Status</span><span>Words</span><span>Index</span>
          </div>
          {filteredPages.map((page) => (
            <div key={page.id} className="grid grid-cols-12 items-center gap-3 border-b border-white/5 px-5 py-4 text-sm hover:bg-white/[0.03]">
              <div className="col-span-3 min-w-0"><p className="truncate font-medium">{getHostname(page.url)}</p><p className="truncate text-xs text-muted-foreground">{page.url}</p></div>
              <p className="col-span-2 line-clamp-2">{page.title}</p>
              <p className="col-span-2 line-clamp-2 text-muted-foreground">{page.metaDescription}</p>
              <p className="truncate text-muted-foreground">{page.h1}</p>
              <span className="uppercase text-muted-foreground">{page.language}</span>
              <Badge variant={statusTone(page.statusCode)}>{page.statusCode}</Badge>
              <span>{page.wordCount.toLocaleString()}</span>
              <Badge variant={page.indexable ? "success" : "muted"}>{page.indexable ? "Yes" : "No"}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
