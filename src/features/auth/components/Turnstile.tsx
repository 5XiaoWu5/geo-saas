"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      reset: (widgetId?: string) => void;
    };
    __geoPilotTurnstileCallbacks?: Record<string, (token: string) => void>;
    __geoPilotTurnstileErrors?: Record<string, () => void>;
  }
}

export function Turnstile({ onVerify }: { onVerify: (token: string) => void }) {
  const callbackId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    window.__geoPilotTurnstileCallbacks ??= {};
    window.__geoPilotTurnstileErrors ??= {};

    window.__geoPilotTurnstileCallbacks[callbackId] = (token: string) => {
      setStatus("ready");
      onVerify(token);
    };

    window.__geoPilotTurnstileErrors[callbackId] = () => {
      onVerify("");
      setStatus("error");
    };

    const timer = window.setTimeout(() => {
      if (!containerRef.current?.querySelector("iframe")) setStatus("error");
    }, 12000);

    return () => {
      window.clearTimeout(timer);
      delete window.__geoPilotTurnstileCallbacks?.[callbackId];
      delete window.__geoPilotTurnstileErrors?.[callbackId];
    };
  }, [callbackId, onVerify]);

  if (!siteKey) {
    return <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">未配置人机验证站点密钥。请在 Cloudflare Pages 环境变量中配置。</div>;
  }

  return (
    <div className="space-y-2">
      <Script src={TURNSTILE_SCRIPT_SRC} strategy="afterInteractive" async defer />
      <div
        ref={containerRef}
        className="cf-turnstile min-h-[65px]"
        data-sitekey={siteKey}
        data-theme="dark"
        data-callback={`__geoPilotTurnstileCallbacks.${callbackId}`}
        data-error-callback={`__geoPilotTurnstileErrors.${callbackId}`}
        data-expired-callback={`__geoPilotTurnstileErrors.${callbackId}`}
      />
      {status === "loading" ? <p className="text-xs text-muted-foreground">正在加载人机验证...</p> : null}
      {status === "error" ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">人机验证加载失败，请刷新页面后重试。请确认 Turnstile 允许当前域名。</p> : null}
    </div>
  );
}
