'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, PartyPopper, Eye, MousePointerClick, CalendarPlus, MessageCircle, Navigation } from 'lucide-react';
import { FieldInput, StringArrayEditor } from '@/app/admin/components/FormControls';
import Toggle from '@/app/admin/components/Toggle';

interface CtaButtonConfig { key: string; label: string; enabled: boolean }
interface RelatedSectionConfig { key: string; label: string; enabled: boolean; order: number }
interface ChecklistItemConfig { key: string; label: string; enabled: boolean }
interface BookingSuccessConfigData {
  thankYouHeadline: string;
  thankYouMessage: string;
  preVisitInstructions: string[];
  ctaButtons: CtaButtonConfig[];
  relatedSections: RelatedSectionConfig[];
  checklistEnabled: boolean;
  checklistItems: ChecklistItemConfig[];
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-[#0B2560]">{title}</h2>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function ItemToggleRow({
  label, enabled, onToggle, onLabelChange,
}: {
  label: string; enabled: boolean; onToggle: () => void; onLabelChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${enabled ? 'bg-[#0B2560]' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <input
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        className="flex-1 bg-transparent text-sm font-semibold text-gray-700 focus:outline-none"
      />
    </div>
  );
}

const ANALYTICS_ROWS: { key: string; label: string; icon: typeof Eye }[] = [
  { key: 'page_view', label: 'Page Views', icon: Eye },
  { key: 'cta_click_calendar', label: 'Calendar Adds', icon: CalendarPlus },
  { key: 'cta_click_whatsapp', label: 'WhatsApp Clicks', icon: MessageCircle },
  { key: 'cta_click_directions', label: 'Direction Clicks', icon: Navigation },
];

export default function BookingSuccessAdminPage() {
  const [data, setData] = useState<BookingSuccessConfigData | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/booking-success').then((r) => r.json()),
      fetch('/api/admin/booking-success/analytics').then((r) => r.json()),
    ])
      .then(([configRes, analyticsRes]) => {
        if (configRes.success) setData(configRes.data);
        if (analyticsRes.success) setAnalytics(analyticsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/booking-success', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) { setData(result.data); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400 text-center py-10">Loading…</p>;
  if (!data) return <p className="text-sm text-red-500 text-center py-10">Failed to load booking success config.</p>;

  const setCta = (i: number, patch: Partial<CtaButtonConfig>) => {
    const next = [...data.ctaButtons];
    next[i] = { ...next[i], ...patch };
    setData({ ...data, ctaButtons: next });
  };
  const setSection = (i: number, patch: Partial<RelatedSectionConfig>) => {
    const next = [...data.relatedSections];
    next[i] = { ...next[i], ...patch };
    setData({ ...data, relatedSections: next });
  };
  const setChecklistItem = (i: number, patch: Partial<ChecklistItemConfig>) => {
    const next = [...data.checklistItems];
    next[i] = { ...next[i], ...patch };
    setData({ ...data, checklistItems: next });
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2"><PartyPopper size={26} /> Booking Success Page</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure the page a patient sees after booking (/book/success) — content, CTA buttons, and the pre-visit checklist.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ANALYTICS_ROWS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4">
            <Icon size={16} className="text-[#F5A623] mb-2" />
            <p className="text-2xl font-extrabold text-[#0B2560]">{analytics[key] ?? 0}</p>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <Card title="Thank You Message" sub="Use {name} to insert the patient's first name.">
        <FieldInput label="Headline" value={data.thankYouHeadline} onChange={(v) => setData({ ...data, thankYouHeadline: v })} />
        <FieldInput label="Message" value={data.thankYouMessage} onChange={(v) => setData({ ...data, thankYouMessage: v })} type="textarea" />
      </Card>

      <Card title="CTA Buttons" sub="Toggle which buttons show and edit their labels.">
        <div className="space-y-2">
          {data.ctaButtons.map((cta, i) => (
            <ItemToggleRow
              key={cta.key}
              label={cta.label}
              enabled={cta.enabled}
              onToggle={() => setCta(i, { enabled: !cta.enabled })}
              onLabelChange={(v) => setCta(i, { label: v })}
            />
          ))}
        </div>
      </Card>

      <Card title="Pre-Visit Instructions" sub="Shown as a bulleted list under 'Before You Arrive'.">
        <StringArrayEditor label="Instructions" items={data.preVisitInstructions} onChange={(v) => setData({ ...data, preVisitInstructions: v })} />
      </Card>

      <Card title="Related Content Sections" sub="Toggle which sections show below the checklist, and their display order.">
        <div className="space-y-2">
          {[...data.relatedSections]
            .sort((a, b) => a.order - b.order)
            .map((section) => {
              const i = data.relatedSections.findIndex((s) => s.key === section.key);
              return (
                <ItemToggleRow
                  key={section.key}
                  label={section.label}
                  enabled={section.enabled}
                  onToggle={() => setSection(i, { enabled: !section.enabled })}
                  onLabelChange={(v) => setSection(i, { label: v })}
                />
              );
            })}
        </div>
      </Card>

      <Card title="Prepare for Your Consultation — Checklist">
        <Toggle
          checked={data.checklistEnabled}
          onChange={(v) => setData({ ...data, checklistEnabled: v })}
          label="Show checklist"
          description="A 'Next Steps' card nudging patients to complete an AI assessment, upload reports, save to calendar, and get directions before their visit."
        />
        {data.checklistEnabled && (
          <div className="space-y-2 pt-2">
            {data.checklistItems.map((item, i) => (
              <ItemToggleRow
                key={item.key}
                label={item.label}
                enabled={item.enabled}
                onToggle={() => setChecklistItem(i, { enabled: !item.enabled })}
                onLabelChange={(v) => setChecklistItem(i, { label: v })}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
