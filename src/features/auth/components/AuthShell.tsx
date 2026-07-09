import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AuthShell({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden border-r border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,.16),transparent_35%),#020617] p-10 lg:flex lg:flex-col lg:justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
          <div><p className="font-semibold">GeoPilot AI</p><p className="text-xs text-muted-foreground">Enterprise GEO platform</p></div>
        </Link>
        <div className="max-w-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-primary">Secure Workspace</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight">Protect every GEO workflow with enterprise-grade authentication.</h1>
          <p className="mt-6 text-lg text-muted-foreground">Database sessions, email verification, Turnstile protection and secure account recovery for modern SaaS teams.</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
          <div className="mb-6"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>
          {children}
          {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
