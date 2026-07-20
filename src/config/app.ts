import type { LucideIcon } from "lucide-react";
import { BookOpen, ClipboardList, CreditCard, FileText, Gauge, HelpCircle, KeyRound, Layers3, LineChart, SearchCheck, Sparkles, UserCircle } from "lucide-react";

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
      { titleKey: "nav.projects", href: "/projects", icon: Layers3 },
    ],
  },
  {
    titleKey: "nav.growthEngines",
    items: [
      { titleKey: "nav.seoGrowth", href: "/seo", icon: SearchCheck, activePrefixes: ["/crawl", "/inventory", "/analyzer", "/query-generator"] },
      { titleKey: "nav.geoGrowth", href: "/geo", icon: Sparkles, activePrefixes: ["/entity", "/simulator", "/visibility", "/campaigns", "/insights"] },
    ],
  },
  {
    titleKey: "nav.operationCenters",
    items: [
      { titleKey: "nav.knowledgeCenter", href: "/knowledge", icon: BookOpen },
      { titleKey: "nav.optimizationCenter", href: "/optimization", icon: ClipboardList },
      { titleKey: "nav.growthCenter", href: "/growth", icon: LineChart },
      { titleKey: "nav.reports", href: "/reports", icon: FileText },
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
