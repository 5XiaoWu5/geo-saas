"use client";

import { Bell, Search } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceSwitcher } from "@/features/workspace/components/WorkspaceSwitcher";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MobileNav } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

export function TopNav() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <MobileNav />
        <div className="hidden min-w-0 flex-1 md:block lg:max-w-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-10 rounded-xl border-white/10 bg-white/[0.04] pl-9" placeholder={t("topNav.searchPlaceholder")} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <WorkspaceSwitcher />
          <LanguageSwitcher />
          <Button variant="outline" size="icon" aria-label={t("topNav.notifications")} className="border-white/10 bg-white/[0.04]">
            <Bell className="h-4 w-4" />
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}


