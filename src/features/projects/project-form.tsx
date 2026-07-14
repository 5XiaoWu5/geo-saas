"use client";

import type { FormEvent } from "react";
import type { Project, ProjectFormValues } from "@/types/project";
import { projectCountries, projectIndustries, projectLanguages } from "@/data/projects";
import { getProjectCountryLabel, getProjectIndustryLabel, getProjectLanguageLabel } from "@/features/projects/project-mapper";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const emptyProject: ProjectFormValues = {
  name: "",
  websiteUrl: "https://",
  language: "English",
  country: "United States",
  industry: "SaaS",
  description: "",
};

export function ProjectForm({ project, onSubmit, onCancel, submitting = false }: { project?: Project; onSubmit: (values: ProjectFormValues) => void | Promise<void>; onCancel: () => void; submitting?: boolean }) {
  const { t } = useI18n();
  const initialValues = project ?? emptyProject;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onSubmit({
      name: String(formData.get("name") ?? ""),
      websiteUrl: String(formData.get("websiteUrl") ?? ""),
      language: String(formData.get("language") ?? "English") as ProjectFormValues["language"],
      country: String(formData.get("country") ?? "United States") as ProjectFormValues["country"],
      industry: String(formData.get("industry") ?? "SaaS") as ProjectFormValues["industry"],
      description: String(formData.get("description") ?? ""),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="project-name">{t("projects.projectName")}</Label>
        <Input id="project-name" name="name" defaultValue={initialValues.name} required placeholder="??????????" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="website-url">{t("projects.websiteUrl")}</Label>
        <Input id="website-url" name="websiteUrl" defaultValue={initialValues.websiteUrl} required placeholder="https://example.com" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="language">{t("common.language")}</Label>
          <Select id="language" name="language" defaultValue={initialValues.language}>{projectLanguages.map((item) => <option key={item} value={item}>{getProjectLanguageLabel(item)}</option>)}</Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="country">{t("common.country")}</Label>
          <Select id="country" name="country" defaultValue={initialValues.country}>{projectCountries.map((item) => <option key={item} value={item}>{getProjectCountryLabel(item)}</option>)}</Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="industry">{t("common.industry")}</Label>
          <Select id="industry" name="industry" defaultValue={initialValues.industry}>{projectIndustries.map((item) => <option key={item} value={item}>{getProjectIndustryLabel(item)}</option>)}</Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">{t("projects.projectDescription")}</Label>
        <Textarea id="description" name="description" defaultValue={initialValues.description} required placeholder="??????????????????" />
      </div>
      <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "正在保存..." : project ? t("common.saveChanges") : t("projects.createProject")}</Button>
      </div>
    </form>
  );
}

