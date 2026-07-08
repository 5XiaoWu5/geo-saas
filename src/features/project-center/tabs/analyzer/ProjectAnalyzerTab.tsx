"use client";

import { useEffect, useState } from "react";
import { Database, Play, Radar } from "lucide-react";
import type { GeoAnalyzerReport } from "@/features/geo-analyzer/types";
import { AIAnswerPreview } from "@/features/geo-analyzer/components/AIAnswerPreview";
import { CitationGap } from "@/features/geo-analyzer/components/CitationGap";
import { EntityPanel } from "@/features/geo-analyzer/components/EntityPanel";
import { GeoScoreCard } from "@/features/geo-analyzer/components/GeoScoreCard";
import { createScan, startScan, getProjectIssues, type GEOIssue, type GeoScanResult, type ScanProgress } from "@/features/geo-engine/core";
import { ProjectLoadingSkeleton } from "@/features/project-center/components/ProjectStates";
import { useProject } from "@/features/project-center/context/ProjectContext";
import { getAnalyzerResult } from "@/features/project-center/services/project.service";
import { useWorkspace } from "@/features/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ProjectAnalyzerTab() {
  const { project, projectId } = useProject();
  const { workspace } = useWorkspace();
  const [report, setReport] = useState<GeoAnalyzerReport | null>(null);
  const [scanResult, setScanResult] = useState<GeoScanResult | null>(null);
  const [issues, setIssues] = useState<GEOIssue[]>([]);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    void getAnalyzerResult(projectId).then(setReport);
  }, [projectId]);

  async function handleRunScan() {
    setScanning(true);
    const scan = await createScan({ workspaceId: workspace.id, projectId, url: project.url });
    setScanProgress({ status: "running", percentage: 8, currentPage: project.url, completedPages: 0, totalPages: 1 });
    const result = await startScan(scan.id);
    setScanResult(result);
    setIssues(await getProjectIssues(projectId));
    setScanProgress({ status: result.scan.status, percentage: result.scan.progress, currentPage: result.scan.currentPage, completedPages: result.scan.completedPages, totalPages: result.scan.totalPages });
    setScanning(false);
  }

  if (!report) return <ProjectLoadingSkeleton />;

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3"><div className="rounded-2xl bg-primary/10 p-3"><Database className="h-5 w-5 text-primary" /></div><div><p className="font-medium">GEO Engine Core v1</p><p className="text-sm text-muted-foreground">{report.inventorySource.pages} pages · {report.inventorySource.indexedPages} indexed · {report.inventorySource.structuredDataItems} structured data</p></div></div>
          <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Project ID: {report.projectId}</Badge><Button onClick={() => void handleRunScan()} disabled={scanning}>{scanning ? <Radar className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run GEO Scan</Button></div>
        </CardContent>
      </Card>

      {scanning || scanProgress ? <ScanProgressCard progress={scanProgress} scanning={scanning} /> : null}
      {scanResult ? <ScanResultCard result={scanResult} /> : null}
      {issues.length ? <GEOIssuesCard issues={issues} /> : null}

      <GeoScoreCard analysis={report.score} />
      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]"><EntityPanel entity={report.entity} /><CitationGap items={report.citationGaps} /></section>
      <AIAnswerPreview simulations={report.simulations} />
    </div>
  );
}

function ScanProgressCard({ progress, scanning }: { progress: ScanProgress | null; scanning: boolean }) {
  const percentage = progress?.percentage ?? 0;
  return <Card className="glass-panel border-primary/20"><CardContent className="p-5"><div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{scanning ? "Scanning..." : "Scan completed"}</p><p className="text-sm text-muted-foreground">Pages scanned: {progress?.completedPages ?? 0}/{progress?.totalPages ?? 0}</p></div><span className="text-sm text-muted-foreground">Current: {progress?.currentPage ?? "—"}</span></div><Progress value={percentage} className="h-3" /></CardContent></Card>;
}

function ScanResultCard({ result }: { result: GeoScanResult }) {
  return (
    <Card className="glass-panel border-primary/20">
      <CardHeader><CardTitle>Latest Scan Result</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-6">
        <ScoreCell label="Overall" value={result.analysis.overallScore} />
        <ScoreCell label="Entity" value={result.analysis.entityScore} />
        <ScoreCell label="Schema" value={result.analysis.schemaScore} />
        <ScoreCell label="Content" value={result.analysis.contentScore} />
        <ScoreCell label="AI Readability" value={result.analysis.aiReadabilityScore} />
        <ScoreCell label="Pages" value={result.analysis.pageScores.length} />
        <div className="md:col-span-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="font-medium">Detected Entities</p><div className="mt-3 flex flex-wrap gap-2">{result.analysis.entities.slice(0, 12).map((entity) => <Badge key={entity.id} variant="outline">{entity.type}: {entity.name}</Badge>)}</div></div>
        <div className="md:col-span-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="font-medium">Recommendations</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{result.analysis.recommendations.map((item) => <li key={item}>• {item}</li>)}</ul></div>
      </CardContent>
    </Card>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold text-primary">{value}</p><Progress value={value} className="mt-3" /></div>;
}



function GEOIssuesCard({ issues }: { issues: GEOIssue[] }) {
  const critical = issues.filter((issue) => issue.severity === "critical");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const suggestions = issues.filter((issue) => issue.severity === "suggestion");

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>GEO Issues</CardTitle></CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        <IssueGroup title="Critical Issues" issues={critical} />
        <IssueGroup title="Warnings" issues={warnings} />
        <IssueGroup title="Optimization Opportunities" issues={suggestions} />
      </CardContent>
    </Card>
  );
}

function IssueGroup({ title, issues }: { title: string; issues: GEOIssue[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="font-medium">{title}</p>
      <div className="mt-3 space-y-3">
        {issues.map((issue) => {
          const evidence = issue.evidence?.[0];
          return (
            <div key={issue.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={issue.severity === "critical" ? "outline" : issue.severity === "warning" ? "warning" : "muted"}>{issue.category}</Badge>
                <IssueStatusBadge status={issue.status} />
              </div>
              <p className="mt-2 font-medium">{issue.title}</p>
              <p className="mt-1 text-muted-foreground">{evidence ? `${evidence.url}: ${evidence.finding}` : "Evidence stored in issue evidence repository"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IssueStatusBadge({ status }: { status: GEOIssue["status"] }) {
  const label = status === "fixed" ? "FIXED" : status === "regression" ? "REGRESSION" : status === "ignored" ? "IGNORED" : status === "in_progress" ? "IN PROGRESS" : "OPEN";
  const variant = status === "fixed" ? "success" : status === "regression" ? "warning" : status === "ignored" ? "muted" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}
