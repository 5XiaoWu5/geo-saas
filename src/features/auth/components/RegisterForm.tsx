"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Turnstile } from "@/features/auth/components/Turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formData.get("name"), email, password: formData.get("password"), turnstileToken }) });
    const result = await response.json() as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to create account.");
      return;
    }
    router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return <form onSubmit={onSubmit} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" required /></div><div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div><div className="grid gap-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div><Turnstile onVerify={setTurnstileToken} />{error ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}<Button disabled={loading} className="w-full">{loading ? "Creating account..." : "Create account"}</Button></form>;
}
