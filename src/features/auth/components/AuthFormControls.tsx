"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthField({ id, label, icon, action, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between"><Label htmlFor={id} className="text-sm font-medium text-slate-200/90">{label}</Label>{action}</div>
      <div className="relative group">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-cyan-300">{icon}</div>
        <Input id={id} className={`h-12 rounded-2xl border-white/10 bg-white/[0.055] pl-11 pr-4 text-base text-slate-100 shadow-inner shadow-black/10 transition placeholder:text-slate-500 hover:border-white/16 focus-visible:border-cyan-300/50 focus-visible:ring-cyan-300/25 ${className ?? ""}`} {...props} />
      </div>
    </div>
  );
}

export function PasswordField({ id, label, action, autoComplete = "current-password" }: { id: string; label: string; action?: ReactNode; autoComplete?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between"><Label htmlFor={id} className="text-sm font-medium text-slate-200/90">{label}</Label>{action}</div>
      <div className="relative group">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-cyan-300"><EyeOff className="h-4 w-4" /></div>
        <Input id={id} name="password" type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} required className="h-12 rounded-2xl border-white/10 bg-white/[0.055] pl-11 pr-12 text-base text-slate-100 shadow-inner shadow-black/10 transition hover:border-white/16 focus-visible:border-cyan-300/50 focus-visible:ring-cyan-300/25" />
        <button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-cyan-200" aria-label={visible ? "隐藏密码" : "显示密码"}>{visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
      </div>
    </div>
  );
}

export function AuthSubmitButton({ loading, loadingText, children }: { loading: boolean; loadingText: string; children: ReactNode }) {
  return <Button disabled={loading} className="h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] hover:shadow-cyan-400/25 disabled:opacity-70">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />{loadingText}</> : children}</Button>;
}

export function AuthAlert({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  const className = type === "error" ? "border-red-400/25 bg-red-500/10 text-red-200" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  return <p className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${className}`}>{children}</p>;
}
