import type { LucideIcon } from "lucide-react";
import { BookOpen, CircleDot, ClipboardList, CreditCard, FileText, Gauge, HelpCircle, KeyRound, LineChart, SearchCheck, Sparkles, Swords, UserCircle } from "lucide-react";

export type NavItem = {
  titleKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  activePrefixes?: string[];
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
      { titleKey: "nav.dashboard", href: "/dashboard", icon: Gauge },
    ],
  },
  {
    titleKey: "nav.growthEngines",
    items: [
      { titleKey: "nav.seoGrowth", href: "/seo", icon: SearchCheck, activePrefixes: ["/crawl", "/inventory", "/analyzer", "/query-generator"] },
      { titleKey: "nav.geoGrowth", href: "/geo", icon: Sparkles, activePrefixes: ["/entity", "/simulator", "/visibility", "/campaigns", "/insights"] },
      { titleKey: "nav.growthCenter", href: "/growth/overview", icon: LineChart, activePrefixes: ["/growth"] },
      { titleKey: "nav.growthReports", href: "/reports", icon: FileText },
    ],
  },
  {
    titleKey: "nav.assetManagement",
    items: [
      { titleKey: "nav.knowledgeCenter", href: "/knowledge", icon: BookOpen },
      { titleKey: "nav.competitorCenter", href: "/competitors", icon: Swords },
    ],
  },
  {
    titleKey: "nav.executionCenter",
    items: [
      { titleKey: "nav.optimizationCenter", href: "/optimization", icon: ClipboardList },
      { titleKey: "nav.growthActions", href: "/actions", icon: CircleDot },
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
