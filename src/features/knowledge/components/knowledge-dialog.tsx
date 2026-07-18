"use client";

import type { FormEvent, ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";

export function KnowledgeDialog({ title, open, busy, error, children, onClose, onSubmit }: { title: string; open: boolean; busy: boolean; error: string; children: ReactNode; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <button type="button" aria-label={t("knowledge.close")} className="absolute inset-0 cursor-default" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative z-10 flex h-full w-full min-w-0 flex-col overflow-hidden border-white/10 bg-background sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl sm:border">
        <div className="flex min-h-14 items-center justify-between border-b border-white/10 px-4 sm:px-6">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={t("knowledge.close")} onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">{children}{error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>{t("knowledge.cancel")}</Button>
          <Button type="submit" className="min-h-11" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t("knowledge.save")}</Button>
        </div>
      </form>
    </div>
  );
}

export function DialogField({ id, label, name, required = false, placeholder = "" }: { id: string; label: string; name: string; required?: boolean; placeholder?: string }) {
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} required={required} placeholder={placeholder} className="min-h-11 w-full" /></div>;
}

export function DialogTextField({ id, label, name, required = false, placeholder = "", rows = 3 }: { id: string; label: string; name: string; required?: boolean; placeholder?: string; rows?: number }) {
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Textarea id={id} name={name} required={required} placeholder={placeholder} rows={rows} className="min-h-24 w-full resize-y" /></div>;
}

export function lines(value: FormDataEntryValue | null) {
  return String(value ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}
