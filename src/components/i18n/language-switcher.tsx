"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  return (
    <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04]" aria-label="当前语言：简体中文">
      <Languages className="h-4 w-4" />
      简体中文
    </Button>
  );
}
