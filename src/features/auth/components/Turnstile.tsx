"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_ID = "geopilot-turnstile-script";

export type TurnstileHandle = {
  reset: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile 脚本加载失败")), { once: true });
      if (window.turnstile) resolve();
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile 脚本加载失败"));
    document.head.appendChild(script);
  });
}

export const Turnstile = forwardRef<TurnstileHandle, { onVerify: (token: string) => void }>(function Turnstile({ onVerify }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const reset = useCallback(() => {
    onVerify("");
    setStatus("loading");
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
    else window.turnstile?.reset();
  }, [onVerify]);

  useImperativeHandle(ref, () => ({ reset }), [reset]);

  useEffect(() => {
    let cancelled = false;

    async function renderWidget() {
      if (!siteKey || !containerRef.current || renderedRef.current) return;
      try {
        await loadTurnstileScript();
        if (cancelled || !containerRef.current || !window.turnstile || renderedRef.current) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          size: "normal",
          callback: (token: string) => {
            setStatus("ready");
            onVerify(token);
          },
          "error-callback": () => {
            onVerify("");
            setStatus("error");
          },
          "expired-callback": () => {
            onVerify("");
            setStatus("error");
          },
        });
        renderedRef.current = true;
      } catch {
        if (!cancelled) {
          onVerify("");
          setStatus("error");
        }
      }
    }

    void renderWidget();

    return () => {
      cancelled = true;
      if (widgetIdRef.current) window.turnstile?.remove?.(widgetIdRef.current);
      widgetIdRef.current = null;
      renderedRef.current = false;
    };
  }, [onVerify, siteKey]);

  if (!siteKey) {
    return <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">未配置人机验证站点密钥。请在 Cloudflare Pages 环境变量中配置。</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-[48px] items-center justify-center rounded-2xl border border-white/8 bg-white/[0.018] px-2 py-1 opacity-70 transition hover:opacity-100">
        <div ref={containerRef} className="origin-center scale-[0.9]" />
      </div>
      {status === "error" ? <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">安全校验未完成，请重新验证后再试。</p> : null}
    </div>
  );
});
