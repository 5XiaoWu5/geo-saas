import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Boxes, BrainCircuit, Building2, ClipboardList, CreditCard, Eye, FileText, FlaskConical, Gauge, HelpCircle, KeyRound, Layers3, LineChart, MessagesSquare, ScanSearch, Settings, Sparkles, UserCircle } from "lucide-react";

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
  { titleKey: "nav.entity", href: "/entity", icon: Building2 },
  { titleKey: "nav.campaigns", href: "/campaigns", icon: MessagesSquare },
  { titleKey: "nav.simulator", href: "/simulator", icon: FlaskConical },
  { titleKey: "nav.growth", href: "/growth", icon: LineChart },
  { titleKey: "nav.insights", href: "/insights", icon: BrainCircuit },
  { titleKey: "nav.optimization", href: "/optimization", icon: ClipboardList },
  { titleKey: "nav.visibility", href: "/visibility", icon: Eye },
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
