"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";
import { GEO_CAMPAIGN_PLATFORMS, type GeoCampaignCreateInput, type GeoCampaignPlatform, type GeoCampaignProject } from "../types";

const GOALS = ["increase_visibility", "competitor_analysis", "procurement_leads"] as const;
type CampaignGoal = (typeof GOALS)[number];

type Props = {
  projects: GeoCampaignProject[];
  selectedProjectId: string;
  submitting: boolean;
  onProjectChange: (projectId: string) => void;
  onSubmit: (input: GeoCampaignCreateInput) => void;
};

export function CampaignCreateForm({ projects, selectedProjectId, submitting, onProjectChange, onSubmit }: Props) {
  const { t } = useI18n();
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null, [projects, selectedProjectId]);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [targetCustomers, setTargetCustomers] = useState("");
  const [goals, setGoals] = useState<CampaignGoal[]>(["increase_visibility", "procurement_leads"]);
  const [platforms, setPlatforms] = useState<GeoCampaignPlatform[]>(["ChatGPT", "Gemini", "Claude"]);
  const [queryCount, setQueryCount] = useState(50);

  useEffect(() => {
    if (!selectedProject) return;
    setName(`${selectedProject.name} GEO Campaign`);
    setIndustry(selectedProject.industry || "");
    setBusinessDescription(selectedProject.description || "");
  }, [selectedProject]);

  function toggleGoal(goal: CampaignGoal) {
    setGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]);
  }

  function togglePlatform(platform: GeoCampaignPlatform) {
    setPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId || platforms.length === 0 || goals.length === 0) return;
    onSubmit({
      projectId: selectedProjectId,
      name,
      industry,
      businessDescription,
      targetCustomers,
      goal: goals.join(","),
      platforms,
      queryCount,
    });
  }

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" /> {t("campaigns.createTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaign-project">{t("campaigns.project")}</Label>
              <Select id="campaign-project" value={selectedProjectId} onChange={(event) => onProjectChange(event.target.value)} required>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-name">{t("campaigns.campaignName")}</Label>
              <Input id="campaign-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-industry">{t("campaigns.industry")}</Label>
            <Input id="campaign-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-business">{t("campaigns.businessDescription")}</Label>
            <Textarea id="campaign-business" value={businessDescription} onChange={(event) => setBusinessDescription(event.target.value)} rows={4} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-customers">{t("campaigns.targetCustomers")}</Label>
            <Textarea id="campaign-customers" value={targetCustomers} onChange={(event) => setTargetCustomers(event.target.value)} rows={2} placeholder={t("campaigns.targetCustomersPlaceholder")} />
          </div>

          <div className="space-y-2">
            <Label>{t("campaigns.goals")}</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {GOALS.map((goal) => (
                <button
                  type="button"
                  key={goal}
                  onClick={() => toggleGoal(goal)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${goals.includes(goal) ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}
                >
                  {t(`campaigns.goal.${goal}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("campaigns.platforms")}</Label>
            <div className="flex flex-wrap gap-2">
              {GEO_CAMPAIGN_PLATFORMS.map((platform) => (
                <button
                  type="button"
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${platforms.includes(platform) ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-query-count">{t("campaigns.queryCount")}</Label>
            <Select id="campaign-query-count" value={String(queryCount)} onChange={(event) => setQueryCount(Number(event.target.value))}>
              {[50, 100, 500].map((count) => <option key={count} value={count}>{count}</option>)}
            </Select>
          </div>

          <Button type="submit" disabled={submitting || !selectedProjectId || goals.length === 0 || platforms.length === 0} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("campaigns.createAction")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
