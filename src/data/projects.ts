import type { Project, ProjectCountry, ProjectIndustry, ProjectLanguage } from "@/types/project";
import { createProject, projects } from "@/features/project-center/data/projects";

export const projectLanguages: ProjectLanguage[] = ["English", "Chinese", "Spanish", "German", "Japanese"];
export const projectCountries: ProjectCountry[] = ["United States", "China", "United Kingdom", "Germany", "Japan", "Singapore"];
export const projectIndustries: ProjectIndustry[] = ["SaaS", "Fintech", "Healthcare", "E-commerce", "Education", "Manufacturing"];

export const mockProjects = projects;

export function createMockProject(values: Pick<Project, "name" | "websiteUrl" | "language" | "country" | "industry" | "description">): Project {
  return createProject(values);
}
