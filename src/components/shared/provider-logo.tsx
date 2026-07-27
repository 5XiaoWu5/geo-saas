"use client";

import { useState } from "react";
import Image from "next/image";
import { Network } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AISearchConnectionType, AISearchProviderType } from "@/features/real-ai-search/types";
import { PROVIDER_METADATA } from "@/features/real-ai-search/provider-metadata";

export function ProviderLogo({
  provider,
  connectionType = provider === "OPENAI" ? "OPENAI_OFFICIAL" : "NATIVE",
  size = 28,
  className,
  fallback,
}: {
  provider: AISearchProviderType;
  connectionType?: AISearchConnectionType;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const compatible = provider === "OPENAI" && connectionType === "OPENAI_COMPATIBLE";
  const label = compatible ? "Third-party AI interface" : PROVIDER_METADATA[provider].name;
  const icon = failed
    ? fallback ?? <span className="text-xs font-semibold" aria-hidden="true">{label.slice(0, 2).toUpperCase()}</span>
    : compatible
      ? <Network aria-hidden="true" style={{ width: size, height: size }} />
      : (
        <Image
          src={PROVIDER_METADATA[provider].logo}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="block object-contain"
          onError={() => setFailed(true)}
        />
      );

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950 text-slate-100",
        className,
      )}
      style={{ width: Math.max(44, size + 16), height: Math.max(44, size + 16) }}
      role="img"
      aria-label={label}
    >
      {icon}
    </span>
  );
}
