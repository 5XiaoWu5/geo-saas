"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: formData.get("password") }) });
    const result = await response.json() as { error?: string };
    setLoading(false);
    if (!response.ok) { setError(result.error ?? "Unable to reset password."); return; }
    setMessage("Password updated. You can sign in now.");
  }

  if (!token) return <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">Invalid reset link.</p>;

  return <form onSubmit={onSubmit} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>{error ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}{message ? <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{message} <Link href="/login" className="underline">Sign in</Link></p> : null}<Button disabled={loading} className="w-full">{loading ? "Updating..." : "Reset password"}</Button></form>;
}
