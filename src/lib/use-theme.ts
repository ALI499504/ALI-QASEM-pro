"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const THEME_KEY = "mrobot-theme";

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Load from localStorage or default to dark
    const stored = (typeof window !== "undefined" && localStorage.getItem(THEME_KEY)) as Theme | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      applyTheme(stored);
    } else {
      applyTheme("dark");
    }
  }, []);

  function applyTheme(t: Theme) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (t === "light") {
      root.setAttribute("data-theme", "light");
      root.classList.add("light-theme");
      root.classList.remove("dark-theme");
    } else {
      root.removeAttribute("data-theme");
      root.classList.add("dark-theme");
      root.classList.remove("light-theme");
    }
  }

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") localStorage.setItem(THEME_KEY, next);
  }

  return [theme, toggle];
}
