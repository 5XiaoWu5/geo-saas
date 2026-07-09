"use client";

import { useEffect, useRef, useState } from "react";

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "error-callback"?: () => void; "expired-callback"?: () => void; theme?: "dark" | "light" }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

function ensureTurnstileScript(onError: () => void): void {
  if (typeof window === "undefined" || window.turnstile || document.getElementById(TURNSTILE_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = TURNSTILE_SCRIPT_ID;
  script.src = TURNSTILE_SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  script.onerror = onError;
  document.head.appendChild(script);
}

export function Turnstile({ onVerify }: { onVerify: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;`r`n`r`n    const resolvedSiteKey = siteKey;`r`n    let cancelled = false;
    let attempts = 0;
    let timer: number | null = null;

    function renderWhenReady() {
      if (cancelled || !ref.current || widgetId.current) return;

      if (!window.turnstile) {
        attempts += 1;
        if (attempts > 80) {
          setStatus("error");
          return;
        }
        timer = window.setTimeout(renderWhenReady, 250);
        return;
      }

      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: resolvedSiteKey,
        theme: "dark",
        callback: (token) => {
          setStatus("ready");
          onVerify(token);
        },
        "expired-callback": () => {
          onVerify("");
          if (widgetId.current) window.turnstile?.reset(widgetId.current);
        },
        "error-callback": () => {
          onVerify("");
          setStatus("error");
        },
      });
    }

    ensureTurnstileScript(() => setStatus("error"));
    renderWhenReady();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [onVerify, siteKey]);

  if (!siteKey) {
    return <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">未配置人机验证站点密钥。请在 Cloudflare Pages 环境变量中配置。</div>;
  }

  return (
    <div className="space-y-2">
      <div ref={ref} className="min-h-[65px]" />
      {status === "loading" ? <p className="text-xs text-muted-foreground">正在加载人机验证...</p> : null}
      {status === "error" ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">人机验证加载失败，请刷新页面后重试。</p> : null}
    </div>
  );
}

