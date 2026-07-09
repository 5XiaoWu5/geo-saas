"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

type TurnstileCallbackWindow = Window & Record<string, ((token?: string) => void) | undefined>;

declare global {
  interface Window {
    turnstile?: {
      reset: (widgetId?: string) => void;
    };
  }
}

export function Turnstile({ onVerify }: { onVerify: (token: string) => void }) {
  const callbackId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const successCallbackName = `geoPilotTurnstileSuccess${callbackId}`;
  const errorCallbackName = `geoPilotTurnstileError${callbackId}`;

  useEffect(() => {
    const callbackWindow = window as unknown as TurnstileCallbackWindow;

    callbackWindow[successCallbackName] = (token?: string) => {
      if (!token) {
        onVerify("");
        setStatus("error");
        return;
      }

      setStatus("ready");
      onVerify(token);
    };

    callbackWindow[errorCallbackName] = () => {
      onVerify("");
      setStatus("error");
    };

    const timer = window.setTimeout(() => {
      if (!containerRef.current?.querySelector("iframe") && status === "loading") setStatus("error");
    }, 12000);

    return () => {
      window.clearTimeout(timer);
      delete callbackWindow[successCallbackName];
      delete callbackWindow[errorCallbackName];
    };
  }, [errorCallbackName, onVerify, status, successCallbackName]);

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
        data-size="normal"
        data-callback={successCallbackName}
        data-error-callback={errorCallbackName}
        data-expired-callback={errorCallbackName}
      />
      {status === "loading" ? <p className="text-xs text-muted-foreground">正在加载人机验证...</p> : null}
      {status === "error" ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">人机验证加载失败，请刷新页面后重试。请确认 Turnstile 允许当前域名。</p> : null}
    </div>
  );
}
