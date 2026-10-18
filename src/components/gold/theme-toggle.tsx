"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { playThemeToggle } from "@/lib/audio";
import { useTheme } from "@/lib/use-theme";

export default function ThemeToggle() {
  const [theme, toggle] = useTheme();
  function handleToggle() { playThemeToggle(); toggle(); }

  return (
    <button
      onClick={handleToggle}
      className="flex items-center justify-center w-8 h-8 rounded border border-border bg-secondary hover:border-gold/30 hover:bg-gold/5 transition"
      aria-label="تبديل المظهر"
      title={theme === "dark" ? "التبديل للوضع النهاري" : "التبديل للوضع الليلي"}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {theme === "dark" ? (
          <Moon className="w-3.5 h-3.5 text-gold" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-gold" />
        )}
      </motion.div>
    </button>
  );
}
