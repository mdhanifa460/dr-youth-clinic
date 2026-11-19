'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle, Loader } from 'lucide-react';

function snapshotOf(value: unknown): string {
  try { return JSON.stringify(value) ?? ''; } catch { return ''; }
}

/**
 * Tracks whether a form differs from what was loaded or last saved, and warns
 * before the tab is closed or reloaded while it does.
 *
 * The baseline is taken a moment after `ready` turns true, so changes a form
 * makes to itself while loading (defaults filled in, keywords seeded) don't
 * count as the admin's unsaved work.
 */
export function useUnsavedChanges(value: unknown, ready = true, settleMs = 600) {
  const current = useMemo(() => snapshotOf(value), [value]);
  const latest = useRef(current);
  latest.current = current;
  const [baseline, setBaseline] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || baseline !== null) return;
    const t = setTimeout(() => setBaseline(latest.current), settleMs);
    return () => clearTimeout(t);
  }, [ready, baseline, settleMs]);

  const dirty = ready && baseline !== null && current !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Call after a confirmed save, with the exact value that was sent. */
  const markSaved = useCallback((saved: unknown) => setBaseline(snapshotOf(saved)), []);

  return { dirty, markSaved };
}

/**
 * Sticky header for long admin forms: page title on the left, save status and
 * the Save button on the right, always in view while scrolling.
 */
export default function SaveBar({
  title,
  subtitle,
  dirty,
  saving,
  saved,
  error,
  onSave,
  label = 'Save',
  savingLabel = 'Saving…',
  savedText = 'Saved ✓ live within a few minutes',
  disabled,
  actions,
  bgClass = 'bg-gray-100/95',
  compact = false,
  disabledHint,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error?: string;
  onSave: () => void;
  label?: string;
  savingLabel?: string;
  savedText?: string;
  disabled?: boolean;
  /** Extra controls shown before the Save button (e.g. a "View live" link). */
  actions?: ReactNode;
  bgClass?: string;
  /** Smaller title (a <p>, not an <h1>) for forms whose page already has a heading. */
  compact?: boolean;
  /** Shown instead of the status when the button is disabled, e.g. "Finish all steps to publish". */
  disabledHint?: string;
}) {
  return (
    <div className={`sticky top-0 z-30 -mx-4 px-4 py-3 mb-6 ${bgClass} backdrop-blur border-b border-gray-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
      <div className="min-w-0">
        {compact
          ? <p className="text-base font-bold text-[#0B2560] truncate">{title}</p>
          : <h1 className="text-2xl font-bold text-[#0B2560]">{title}</h1>}
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        {error ? (
          <span role="alert" className="text-xs font-semibold text-red-600 max-w-[280px]">{error}</span>
        ) : saved ? (
          <span className="text-xs font-semibold text-green-600">{savedText}</span>
        ) : disabled && disabledHint ? (
          <span className="text-xs text-gray-400">{disabledHint}</span>
        ) : dirty ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Unsaved changes
          </span>
        ) : null}
        {actions}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || disabled}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition disabled:opacity-60"
        >
          {saving ? <Loader size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : null}
          {saving ? savingLabel : saved ? 'Saved!' : label}
        </button>
      </div>
    </div>
  );
}
