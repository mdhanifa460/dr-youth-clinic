"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemePref = "light" | "dark" | "system";

const ThemeContext = createContext<{ pref: ThemePref; setPref: (p: ThemePref) => void }>({
  pref: "system",
  setPref: () => {},
});

export function useAdminTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "admin-theme";
const DARK_CLASS = "admin-theme-dark";

function readStoredPref(): ThemePref {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

// A blocking inline script (see admin/layout.tsx) already applies the dark
// class to <html> before hydration to avoid a flash — this class toggle just
// keeps it in sync with React state afterwards, imperatively (not via a
// rendered className), so there's nothing for hydration to mismatch on.
export default function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy-init from localStorage: correct from the very first client render
  // (still "system" during SSR, same as the fallback the inline script uses).
  const [pref, setPrefState] = useState<ThemePref>(readStoredPref);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = pref === "dark" || (pref === "system" && mq.matches);
      document.documentElement.classList.toggle(DARK_CLASS, isDark);
    };
    apply();
    if (pref === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [pref]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    localStorage.setItem(STORAGE_KEY, p);
  };

  return <ThemeContext.Provider value={{ pref, setPref }}>{children}</ThemeContext.Provider>;
}
