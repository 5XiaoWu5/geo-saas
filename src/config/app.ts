import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Boxes, ClipboardList, CreditCard, FileText, Gauge, HelpCircle, KeyRound, Layers3, ScanSearch, Settings, Sparkles, UserCircle } from "lucide-react";

export type NavItem = {
  titleKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const appConfig = {
  nameKey: "common.appName",
  taglineKey: "common.tagline",
};

export const mainNavItems: NavItem[] = [
  { titleKey: "nav.dashboard", href: "/dashboard", icon: Gauge },
  { titleKey: "nav.projects", href: "/projects", icon: Layers3 },
  { titleKey: "nav.websiteCrawl", href: "/crawl", icon: ScanSearch },
  { titleKey: "nav.siteInventory", href: "/inventory", icon: Boxes },
  { titleKey: "nav.analyzer", href: "/analyzer", icon: Sparkles },
  { titleKey: "nav.optimization", href: "/optimization", icon: ClipboardList },
  { titleKey: "nav.monitoring", href: "/monitoring", icon: Activity },
  { titleKey: "nav.analysis", href: "/analysis", icon: BarChart3 },
  { titleKey: "nav.reports", href: "/reports", icon: FileText },
  { titleKey: "nav.settings", href: "/settings", icon: Settings },
];

export const accountNavItems: NavItem[] = [
  { titleKey: "nav.profile", href: "/profile", icon: UserCircle },
  { titleKey: "nav.apiKeys", href: "/api-keys", icon: KeyRound },
  { titleKey: "nav.billing", href: "/billing", icon: CreditCard },
  { titleKey: "nav.help", href: "/help", icon: HelpCircle },
];


