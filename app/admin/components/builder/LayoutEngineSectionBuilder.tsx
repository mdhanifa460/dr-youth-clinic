'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader } from 'lucide-react';
import SectionList from './SectionList';
import SectionCard from './SectionCard';
import type { BuilderSection } from '@/app/lib/pageBuilder/types';

// Extends the shared BuilderSection shape (id/type/visible/data) with the
// Content Layout Engine's cross-cutting fields, so the same SectionList /
// SectionCard shell used by Landing Pages / Homepage / About works here too
// — this is the "one Section Builder" reused across page types, not a
// bespoke one for Service Pages.
interface EditableSection extends BuilderSection {
  _id: string;
  variant: string;
  zone: string;
  desktopVisible: boolean;
  tabletVisible: boolean;
  mobileVisible: boolean;
  spacing: string;
  background: string;
  animationPreset: string;
  theme: string;
  sticky: boolean;
  collapsible: boolean;
  condition?: { field: string; operator: string; value?: any };
}

interface CatalogEntry {
  sectionType: string;
  variant: string;
  label: string;
  icon: string;
  allowedZones: string[];
}

function toEditable(doc: any): EditableSection {
  return {
    id: String(doc._id),
    _id: String(doc._id),
    type: doc.sectionType,
    variant: doc.variant,
    zone: doc.zone,
    visible: doc.enabled,
    data: doc.content ?? {},
    desktopVisible: doc.desktopVisible,
    tabletVisible: doc.tabletVisible,
    mobileVisible: doc.mobileVisible,
    spacing: doc.spacing,
    background: doc.background,
    animationPreset: doc.animationPreset,
    theme: doc.theme,
    sticky: doc.sticky,
    collapsible: doc.collapsible,
    condition: doc.condition,
  };
}

export default function LayoutEngineSectionBuilder({
  pageType,
  pageId,
  zones,
}: {
  pageType: string;
  pageId: string;
  zones: { name: string; label: string }[];
}) {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<EditableSection[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [activeZone, setActiveZone] = useState(zones[0]?.name ?? '');
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/sections?pageType=${pageType}&pageId=${pageId}`).then((r) => r.json()),
      fetch(`/api/admin/sections/catalog?pageType=${pageType}`).then((r) => r.json()),
    ]).then(([sectionsRes, catalogRes]) => {
      if (sectionsRes.success) setSections(sectionsRes.data.map(toEditable));
      if (catalogRes.success) setCatalog(catalogRes.data);
      setLoading(false);
    });
  }, [pageType, pageId]);

  const patchSection = async (id: string, patch: Record<string, any>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await fetch(`/api/admin/sections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  };

  const addSection = async (zone: string, entry: CatalogEntry) => {
    const res = await fetch('/api/admin/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageType,
        pageId,
        sectionType: entry.sectionType,
        variant: entry.variant,
        zone,
        content: {},
      }),
    });
    const json = await res.json();
    if (json.success) setSections((prev) => [...prev, toEditable(json.data)]);
    setPickerOpenFor(null);
  };

  const deleteSection = async (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/admin/sections/${id}`, { method: 'DELETE' });
  };

  const reorderZone = async (zone: string, next: EditableSection[]) => {
    setSections((prev) => [...prev.filter((s) => s.zone !== zone), ...next]);
    await fetch('/api/admin/sections/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageType, orderedIds: next.map((s) => s.id) }),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
        <Loader size={14} className="animate-spin" /> Loading sections…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {zones.length > 1 && (
        <div className="flex gap-2 border-b border-gray-100 pb-2">
          {zones.map((z) => (
            <button
              key={z.name}
              type="button"
              onClick={() => setActiveZone(z.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeZone === z.name ? 'bg-[#0B2560] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      )}

      {zones
        .filter((z) => z.name === activeZone)
        .map((zoneDef) => {
          // Already in displayOrder from the GET endpoint's sort; reorderZone
          // below keeps it that way by always persisting the full new order.
          const zoneSections = sections.filter((s) => s.zone === zoneDef.name);
          const zoneCatalog = catalog.filter((c) => c.allowedZones.includes(zoneDef.name));

          return (
            <div key={zoneDef.name} className="space-y-3">
              <SectionList
                sections={zoneSections}
                onReorder={(next) => reorderZone(zoneDef.name, next)}
                renderSection={(section, _i, dragControls) => (
                  <SectionCard
                    section={section}
                    label={catalog.find((c) => c.sectionType === section.type && c.variant === section.variant)?.label ?? section.type}
                    icon={catalog.find((c) => c.sectionType === section.type && c.variant === section.variant)?.icon ?? '📦'}
                    dragControls={dragControls}
                    onToggleVisible={() => patchSection(section.id, { enabled: !section.visible })}
                    onDelete={() => deleteSection(section.id)}
                  >
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Spacing</label>
                          <select
                            value={section.spacing}
                            onChange={(e) => patchSection(section.id, { spacing: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          >
                            {['none', 'compact', 'default', 'loose'].map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Background</label>
                          <select
                            value={section.background}
                            onChange={(e) => patchSection(section.id, { background: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          >
                            {['transparent', 'light', 'dark', 'brand'].map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Theme</label>
                          <select
                            value={section.theme}
                            onChange={(e) => patchSection(section.id, { theme: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          >
                            {['inherit', 'light', 'dark'].map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Animation</label>
                          <select
                            value={section.animationPreset}
                            onChange={(e) => patchSection(section.id, { animationPreset: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          >
                            {['none', 'fade-up', 'fade-in'].map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        {(['desktopVisible', 'tabletVisible', 'mobileVisible'] as const).map((key) => (
                          <label key={key} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                            <input
                              type="checkbox"
                              checked={section[key]}
                              onChange={(e) => patchSection(section.id, { [key]: e.target.checked })}
                              className="rounded"
                            />
                            {key.replace('Visible', '')}
                          </label>
                        ))}
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                          <input
                            type="checkbox"
                            checked={section.sticky}
                            onChange={(e) => patchSection(section.id, { sticky: e.target.checked })}
                            className="rounded"
                          />
                          sticky
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                          <input
                            type="checkbox"
                            checked={section.collapsible}
                            onChange={(e) => patchSection(section.id, { collapsible: e.target.checked })}
                            className="rounded"
                          />
                          collapsible
                        </label>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                          Content (JSON) — per-type visual editors are a fast-follow; this is the MVP editor
                        </label>
                        <textarea
                          defaultValue={JSON.stringify(section.data, null, 2)}
                          rows={6}
                          onBlur={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              patchSection(section.id, { content: parsed });
                            } catch {
                              // leave content untouched on invalid JSON — no
                              // silent partial save of unparseable input
                            }
                          }}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
                        />
                      </div>
                    </div>
                  </SectionCard>
                )}
              />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPickerOpenFor(pickerOpenFor === zoneDef.name ? null : zoneDef.name)}
                  className="flex items-center gap-2 text-sm font-bold text-[#0B2560] border border-dashed border-gray-200 rounded-xl px-4 py-2.5 w-full justify-center hover:bg-[#f6faff] transition"
                >
                  <Plus size={14} /> Add Section to {zoneDef.label}
                </button>
                {pickerOpenFor === zoneDef.name && (
                  <div className="mt-2 border border-gray-100 rounded-xl shadow-lg bg-white p-2 grid grid-cols-2 gap-1 max-h-64 overflow-auto">
                    {zoneCatalog.map((entry) => (
                      <button
                        key={`${entry.sectionType}:${entry.variant}`}
                        type="button"
                        onClick={() => addSection(zoneDef.name, entry)}
                        className="flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                      >
                        <span>{entry.icon}</span>
                        <span className="truncate">{entry.label}</span>
                      </button>
                    ))}
                    {zoneCatalog.length === 0 && (
                      <p className="text-xs text-gray-400 italic px-3 py-2 col-span-2">No section types available for this zone yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
