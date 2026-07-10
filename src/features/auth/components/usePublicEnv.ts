'use client';

import { useEffect, useState } from "react";

export function usePublicEnv(name: string): string {
  const [value, setValue] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (window as unknown as Record<string, string | undefined>)[name] ?? "";
  });

  useEffect(() => {
    const nextValue = (window as unknown as Record<string, string | undefined>)[name] ?? "";
    setValue(nextValue);
  }, [name]);

  return value;
}
