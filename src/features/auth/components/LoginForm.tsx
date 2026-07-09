"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Turnstile } from "@/features/auth/components/Turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: formData.get("email"), password: formData.get("password"), turnstileToken }) });
    const result = await response.json() as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to sign in.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return <form onSubmit={onSubmit} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div><div className="grid gap-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link></div><Input id="password" name="password" type="password" autoComplete="current-password" required /></div><Turnstile onVerify={setTurnstileToken} />{error ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}<Button disabled={loading} className="w-full">{loading ? "Signing in..." : "Sign in"}</Button></form>;
}
