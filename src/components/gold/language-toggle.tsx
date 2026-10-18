"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default function LanguageToggle() {
  const { lang, toggleLang } = useI18n();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLang}
      className="border-border bg-secondary hover:bg-accent text-foreground gap-1"
      aria-label="Toggle language"
    >
      <Languages className="w-3.5 h-3.5" />
      <span className="text-xs font-bold">{lang === "ar" ? "EN" : "ع"}</span>
    </Button>
  );
}
