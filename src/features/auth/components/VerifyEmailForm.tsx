"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyEmailForm() {
  const initialEmail = useSearchParams().get("email") ?? "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: formData.get("email"), code: formData.get("code") }) });
    const result = await response.json() as { error?: string };
    setLoading(false);
    if (!response.ok) { setError(result.error ?? "Unable to verify email."); return; }
    setMessage("Email verified. You can sign in now.");
  }

  async function resend(email: string) {
    setResending(true);
    setError("");
    const response = await fetch("/api/auth/send-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const result = await response.json() as { error?: string };
    setResending(false);
    if (!response.ok) { setError(result.error ?? "Unable to resend code."); return; }
    setMessage("A new verification code has been sent.");
  }

  return <form onSubmit={onSubmit} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={initialEmail} required /></div><div className="grid gap-2"><Label htmlFor="code">Verification code</Label><Input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></div>{error ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}{message ? <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{message} {message.includes("verified") ? <Link href="/login" className="underline">Sign in</Link> : null}</p> : null}<Button disabled={loading} className="w-full">{loading ? "Verifying..." : "Verify email"}</Button><Button type="button" variant="outline" disabled={resending} onClick={() => void resend((document.getElementById("email") as HTMLInputElement | null)?.value ?? initialEmail)}>{resending ? "Sending..." : "Resend code"}</Button></form>;
}
