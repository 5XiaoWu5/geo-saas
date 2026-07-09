"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "error-callback"?: () => void; "expired-callback"?: () => void; theme?: "dark" | "light" }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function Turnstile({ onVerify }: { onVerify: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const renderWidget = useCallback(() => {
    if (!siteKey || !ref.current || !window.turnstile || widgetId.current) return;

    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: siteKey,
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
  }, [onVerify, siteKey]);

  if (!siteKey) {
    return <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">未配置人机验证站点密钥。请在 Cloudflare Pages 环境变量中配置。</div>;
  }

  return (
    <div className="space-y-2">
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={renderWidget}
        onReady={renderWidget}
        onError={() => setStatus("error")}
      />
      <div ref={ref} className="min-h-[65px]" />
      {status === "loading" ? <p className="text-xs text-muted-foreground">正在加载人机验证...</p> : null}
      {status === "error" ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">人机验证加载失败，请刷新页面后重试。</p> : null}
    </div>
  );
}
