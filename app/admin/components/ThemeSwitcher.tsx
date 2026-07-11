"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useAdminTheme } from "./AdminThemeProvider";

const OPTIONS = [
  { key: "light", icon: Sun, label: "Light" },
  { key: "dark", icon: Moon, label: "Dark" },
  { key: "system", icon: Monitor, label: "System" },
] as const;

export default function ThemeSwitcher() {
  const { pref, setPref } = useAdminTheme();

  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
      {OPTIONS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setPref(key)}
          title={label}
          aria-label={label}
          className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors ${
            pref === key ? "bg-white text-[#0B2545]" : "text-white/50 hover:text-white/80"
          }`}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}
