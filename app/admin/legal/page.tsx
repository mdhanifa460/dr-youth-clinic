'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, ScrollText } from 'lucide-react';
import LegalRichTextEditor from '@/app/admin/components/LegalRichTextEditor';

interface LegalSection {
  id: string;
  icon: string;
  title: string;
  bodyHtml: string;
}

interface LegalPageData {
  lastUpdated: string;
  heroSubtitle: string;
  sections: LegalSection[];
}

interface LegalContentData {
  _id?: string;
  contactEmail: string;
  privacyPolicy: LegalPageData;
  terms: LegalPageData;
}

function uid() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 8);
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function LegalPageEditor({
  page,
  onChange,
}: {
  page: LegalPageData;
  onChange: (page: LegalPageData) => void;
}) {
  const setSection = (i: number, patch: Partial<LegalSection>) => {
    const sections = [...page.sections];
    sections[i] = { ...sections[i], ...patch };
    onChange({ ...page, sections });
  };
  const addSection = () => {
    onChange({
      ...page,
      sections: [...page.sections, { id: `section-${uid()}`, icon: '📄', title: 'New Section', bodyHtml: '<p></p>' }],
    });
  };
  const removeSection = (i: number) => {
    onChange({ ...page, sections: page.sections.filter((_, idx) => idx !== i) });
  };
  const moveSection = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= page.sections.length) return;
    const sections = [...page.sections];
    [sections[i], sections[j]] = [sections[j], sections[i]];
    onChange({ ...page, sections });
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Last Updated</label>
          <input
            value={page.lastUpdated}
            onChange={(e) => onChange({ ...page, lastUpdated: e.target.value })}
            placeholder="January 2025"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Hero Subtitle</label>
        <textarea
          value={page.heroSubtitle}
          onChange={(e) => onChange({ ...page, heroSubtitle: e.target.value })}
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none"
        />
      </div>

      <div className="space-y-4">
        {page.sections.map((section, i) => (
          <div key={section.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={section.icon}
                  onChange={(e) => setSection(i, { icon: e.target.value })}
                  className="w-12 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center"
                />
                <input
                  value={section.title}
                  onChange={(e) => setSection(i, { title: e.target.value })}
                  placeholder="Section title"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-30"><ArrowUp size={14} /></button>
                <button onClick={() => moveSection(i, 1)} disabled={i === page.sections.length - 1} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-30"><ArrowDown size={14} /></button>
                <button onClick={() => removeSection(i)} className="text-gray-300 hover:text-red-500 ml-1"><Trash2 size={14} /></button>
              </div>
            </div>
            <LegalRichTextEditor html={section.bodyHtml} onChange={(html) => setSection(i, { bodyHtml: html })} />
          </div>
        ))}
      </div>
      <button onClick={addSection} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
        <Plus size={12} /> Add Section
      </button>
    </div>
  );
}

export default function LegalAdminPage() {
  const [data, setData] = useState<LegalContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'privacyPolicy' | 'terms'>('privacyPolicy');

  useEffect(() => {
    fetch('/api/admin/legal')
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/legal', {
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
  if (!data) return <p className="text-sm text-red-500 text-center py-10">Failed to load legal content.</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2"><ScrollText size={26} /> Legal Pages</h1>
          <p className="text-gray-500 text-sm mt-1">Edit the Privacy Policy and Terms of Service pages shown at /privacy-policy and /terms.</p>
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

      <Card title="Contact Email" sub="Shown throughout both pages for privacy/terms enquiries.">
        <input
          value={data.contactEmail}
          onChange={(e) => setData({ ...data, contactEmail: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
        />
      </Card>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setTab('privacyPolicy')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === 'privacyPolicy' ? 'bg-[#0B2560] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
        >
          Privacy Policy
        </button>
        <button
          onClick={() => setTab('terms')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === 'terms' ? 'bg-[#0B2560] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
        >
          Terms of Service
        </button>
      </div>

      <Card title={tab === 'privacyPolicy' ? 'Privacy Policy' : 'Terms of Service'}>
        <LegalPageEditor page={data[tab]} onChange={(page) => setData({ ...data, [tab]: page })} />
      </Card>
    </div>
  );
}
