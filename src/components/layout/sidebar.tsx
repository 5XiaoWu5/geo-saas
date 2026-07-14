"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import { accountNavItems, appConfig, mainNavItems } from "@/config/app";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function NavGroup({ items }: { items: typeof mainNavItems }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href.includes("/analyzer") && pathname.includes("/analyzer"));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground",
              active && "bg-primary/12 text-primary ring-1 ring-primary/20"
            )}
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {t(item.titleKey)}
            </span>
            {item.badge ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted-foreground">{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const { t } = useI18n();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-background/70 p-4 backdrop-blur-xl lg:block">
      <div className="flex h-full flex-col">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 rounded-2xl px-2 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">{t(appConfig.nameKey)}</p>
            <p className="text-xs text-muted-foreground">{t(appConfig.taglineKey)}</p>
          </div>
        </Link>

        <div className="space-y-6">
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t("nav.workspace")}</p>
            <NavGroup items={mainNavItems} />
          </div>
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t("nav.account")}</p>
            <NavGroup items={accountNavItems} />
          </div>
        </div>

        <div className="mt-auto rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <p className="text-sm font-medium">{t("nav.enterprisePlan")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("nav.enterprisePlanDescription")}</p>
          <Button className="mt-4 w-full" size="sm">{t("nav.viewSetup")}</Button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex items-center gap-3 lg:hidden">
      <Button variant="outline" size="icon" aria-label="打开导航菜单" onClick={() => setOpen(true)}>
        <Menu className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-semibold">{t(appConfig.nameKey)}</span>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-background p-4">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="font-semibold">{t(appConfig.nameKey)}</span>
              </div>
              <Button variant="ghost" size="icon" aria-label="关闭导航菜单" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-6 overflow-y-auto">
              <div>
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t("nav.workspace")}</p>
                <NavGroup items={mainNavItems} />
              </div>
              <div>
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t("nav.account")}</p>
                <NavGroup items={accountNavItems} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
