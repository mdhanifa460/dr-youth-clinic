"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type Result = { type: string; label: string; sublabel?: string; href: string };

const TYPE_ICON: Record<string, string> = {
  Service: "🩺",
  Doctor: "👨‍⚕️",
  "Blog Post": "✍️",
  "Landing Page": "🚀",
  Offer: "🏷️",
  Video: "🎥",
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Global ⌘K / Ctrl+K shortcut, Escape to close, and an external open event
  // (used by the sidebar's "Search…" trigger button).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onExternalOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onExternalOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onExternalOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex].href);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/40 flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search services, doctors, blogs, landing pages…"
            className="flex-1 text-sm outline-none placeholder:text-gray-400"
          />
          <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {loading && <p className="px-4 py-6 text-center text-xs text-gray-400">Searching…</p>}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-gray-400">No results for &ldquo;{query}&rdquo;</p>
          )}
          {!loading && query.trim().length < 2 && (
            <p className="px-4 py-6 text-center text-xs text-gray-400">Type at least 2 characters to search</p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.href}-${i}`}
              onClick={() => go(r.href)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                i === activeIndex ? "bg-[#f6faff]" : ""
              }`}
            >
              <span className="text-lg shrink-0">{TYPE_ICON[r.type] || "📄"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{r.label}</p>
                {r.sublabel && <p className="text-xs text-gray-400 truncate">{r.sublabel}</p>}
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">{r.type}</span>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-sans">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-sans">↵</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-sans">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
