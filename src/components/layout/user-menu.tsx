"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useI18n } from "@/i18n/provider";

type SessionUser = { id: string; email: string; name: string | null };

export function UserMenu() {
  const router = useRouter();
  const { locale } = useI18n();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    void fetch("/api/auth/session").then((response) => response.json()).then((data: { user: SessionUser | null }) => setUser(data.user));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials = (user?.name ?? user?.email ?? "GP").slice(0, 2).toUpperCase();

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-1.5 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
      <Avatar className="h-8 w-8 border border-white/10"><AvatarFallback className="bg-primary/15 text-primary">{initials}</AvatarFallback></Avatar>
      <div className="hidden min-w-0 md:block"><p className="truncate text-sm font-medium">{user?.name ?? (locale === "zh" ? "GeoPilot 用户" : "GeoPilot user")}</p><p className="truncate text-xs text-muted-foreground">{user?.email ?? (locale === "zh" ? "正在加载会话..." : "Loading session...")}</p></div>
      <div className="sm:hidden"><LanguageSwitcher compact /></div>
      <Button asChild variant="ghost" size="icon" aria-label={locale === "zh" ? "安全设置" : "Security settings"} className="hidden sm:inline-flex"><Link href="/profile/security"><ShieldCheck className="h-4 w-4" /></Link></Button>
      <Button variant="ghost" size="icon" aria-label={locale === "zh" ? "退出登录" : "Sign out"} onClick={() => void logout()}><LogOut className="h-4 w-4" /></Button>
    </div>
  );
}

