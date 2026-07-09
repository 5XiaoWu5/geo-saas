"use client";

export function getTurnstileToken(form: HTMLFormElement, stateToken: string): string {
  const formData = new FormData(form);
  return stateToken || String(formData.get("cf-turnstile-response") ?? "");
}
