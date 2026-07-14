import type { LucideIcon } from "lucide-react";
import { Gauge, HelpCircle, Layers3, ScanSearch, Settings, UserCircle } from "lucide-react";

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
  { titleKey: "nav.settings", href: "/settings", icon: Settings },
];

export const accountNavItems: NavItem[] = [
  { titleKey: "nav.profile", href: "/profile", icon: UserCircle },
  { titleKey: "nav.help", href: "/help", icon: HelpCircle },
];


