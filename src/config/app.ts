import type { LucideIcon } from "lucide-react";
import { Activity, BookOpen, Bot, BrainCircuit, CircleDot, ClipboardList, CreditCard, FileSearch, FileText, Gauge, HelpCircle, KeyRound, LineChart, SearchCheck, Settings, Sparkles, Swords, UserCircle } from "lucide-react";

export type NavItem = {
  titleKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  activePrefixes?: string[];
  projectHref?: string;
};

export type NavSection = {
  titleKey: string;
  items: NavItem[];
};

export const appConfig = {
  nameKey: "common.appName",
  taglineKey: "common.tagline",
};

export const mainNavSections: NavSection[] = [
  {
    titleKey: "nav.overviewGroup",
    items: [
      { titleKey: "nav.dashboard", href: "/dashboard", icon: Gauge, projectHref: "/projects/:projectId/overview" },
      { titleKey: "nav.aiSearchChecks", href: "/geo", projectHref: "/projects/:projectId/geo/monitoring", icon: SearchCheck, activePrefixes: ["/monitoring", "/visibility"] },
      { titleKey: "nav.websiteAnalysis", href: "/seo", projectHref: "/projects/:projectId/seo", icon: FileSearch, activePrefixes: ["/crawl", "/inventory", "/analyzer"] },
      { titleKey: "nav.optimizationTasks", href: "/optimization", projectHref: "/projects/:projectId/optimization", icon: ClipboardList },
      { titleKey: "nav.automationExecution", href: "/automation", projectHref: "/projects/:projectId/automation", icon: Bot },
      { titleKey: "nav.reportsSimple", href: "/reports", projectHref: "/projects/:projectId/reports", icon: FileText },
      { titleKey: "nav.aiConnections", href: "/geo#ai-connections", projectHref: "/projects/:projectId/geo/monitoring#ai-connections", icon: Activity },
      { titleKey: "nav.projectSettings", href: "/settings", icon: Settings },
    ],
  },
  {
    titleKey: "nav.advanced",
    items: [
      { titleKey: "nav.growthCenter", href: "/growth/overview", icon: LineChart, activePrefixes: ["/growth"] },
      { titleKey: "nav.knowledgeCenter", href: "/knowledge", icon: BookOpen },
      { titleKey: "nav.competitorCenter", href: "/competitors", icon: Swords },
      { titleKey: "nav.growthActions", href: "/actions", icon: CircleDot },
      { titleKey: "nav.growthAgent", href: "/agent", icon: BrainCircuit },
      { titleKey: "nav.geoGrowth", href: "/geo", icon: Sparkles },
    ],
  },
];

export const mainNavItems = mainNavSections.flatMap((section) => section.items);

export const accountNavItems: NavItem[] = [
  { titleKey: "nav.profile", href: "/profile", icon: UserCircle },
  { titleKey: "nav.apiKeys", href: "/api-keys", icon: KeyRound },
  { titleKey: "nav.billing", href: "/billing", icon: CreditCard },
  { titleKey: "nav.help", href: "/help", icon: HelpCircle },
];
