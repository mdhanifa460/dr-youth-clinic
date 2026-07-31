'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  useDroppable, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Eye, EyeOff, Trash2, ChevronDown, Plus, X, Loader, LayoutTemplate, Lock,
} from 'lucide-react';

// The Content Layout Engine's section-instance shape, as edited in this
// builder. Not the shared `BuilderSection` (id/type/visible/data) anymore —
// cross-zone drag-and-drop needs every section from every zone in one flat
// list (so a drag can move an item's `zone` field), which the old
// per-zone-tab SectionList/SectionCard shell couldn't do.
interface EditableSection {
  id: string;
  sectionType: string;
  variant: string;
  zone: string;
  enabled: boolean;
  content: Record<string, any>;
  desktopVisible: boolean;
  tabletVisible: boolean;
  mobileVisible: boolean;
  spacing: string;
  background: string;
  animationPreset: string;
  theme: string;
  sticky: boolean;
  collapsible: boolean;
}

interface CatalogEntry {
  sectionType: string;
  variant: string;
  label: string;
  icon: string;
  allowedZones: string[];
  singleton: boolean;
}

function toEditable(doc: any): EditableSection {
  return {
    id: String(doc._id),
    sectionType: doc.sectionType,
    variant: doc.variant,
    zone: doc.zone,
    enabled: doc.enabled,
    content: doc.content ?? {},
    desktopVisible: doc.desktopVisible,
    tabletVisible: doc.tabletVisible,
    mobileVisible: doc.mobileVisible,
    spacing: doc.spacing,
    background: doc.background,
    animationPreset: doc.animationPreset,
    theme: doc.theme,
    sticky: doc.sticky,
    collapsible: doc.collapsible,
  };
}

function catalogLookup(catalog: CatalogEntry[], sectionType: string, variant: string) {
  return catalog.find((c) => c.sectionType === sectionType && c.variant === variant);
}

const ZONE_ID_PREFIX = 'zone:';

// ─── One section card in a zone ──────────────────────────────────────────────

function SectionCard({
  section, meta, otherZones, onToggleEnabled, onDelete, onMoveTo, onPatch,
}: {
  section: EditableSection;
  meta?: CatalogEntry;
  otherZones: { name: string; label: string }[];
  onToggleEnabled: () => void;
  onDelete: () => void;
  onMoveTo: (zone: string) => void;
  onPatch: (patch: Record<string, any>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
        section.enabled ? 'border-gray-100' : 'border-gray-100 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 touch-none"
          aria-label="Drag to reorder or move between zones"
        >
          <GripVertical size={16} />
        </button>

        <span className="text-xl shrink-0">{meta?.icon ?? '📦'}</span>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 min-w-0 text-left flex items-center gap-2"
        >
          <span className="font-bold text-[#0B2560] text-sm shrink-0">{meta?.label ?? section.sectionType}</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {otherZones.map((z) => (
            <button
              key={z.name}
              type="button"
              onClick={() => onMoveTo(z.name)}
              title={`Move to ${z.label}`}
              className="text-[10px] font-bold text-gray-400 hover:text-[#0B2560] hover:bg-gray-50 px-2 py-1.5 rounded-lg transition whitespace-nowrap"
            >
              → {z.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onToggleEnabled}
            title={section.enabled ? 'Hide section' : 'Show section'}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
              section.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-50'
            }`}
          >
            {section.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? 'Collapse' : 'Configure'}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 transition"
          >
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-4 py-5 bg-gray-50/40 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Spacing</label>
              <select
                value={section.spacing}
                onChange={(e) => onPatch({ spacing: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              >
                {['none', 'compact', 'default', 'loose'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Background</label>
              <select
                value={section.background}
                onChange={(e) => onPatch({ background: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              >
                {['transparent', 'light', 'dark', 'brand'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Theme</label>
              <select
                value={section.theme}
                onChange={(e) => onPatch({ theme: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              >
                {['inherit', 'light', 'dark'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Animation</label>
              <select
                value={section.animationPreset}
                onChange={(e) => onPatch({ animationPreset: e.target.value })}
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
                  onChange={(e) => onPatch({ [key]: e.target.checked })}
                  className="rounded"
                />
                {key.replace('Visible', '')}
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <input type="checkbox" checked={section.sticky} onChange={(e) => onPatch({ sticky: e.target.checked })} className="rounded" />
              sticky
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <input type="checkbox" checked={section.collapsible} onChange={(e) => onPatch({ collapsible: e.target.checked })} className="rounded" />
              collapsible
            </label>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
              Content (JSON) — per-type visual editors are a fast-follow; this is the MVP editor
            </label>
            <textarea
              defaultValue={JSON.stringify(section.content, null, 2)}
              rows={6}
              onBlur={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onPatch({ content: parsed });
                } catch {
                  // leave content untouched on invalid JSON — no silent
                  // partial save of unparseable input
                }
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── One zone column (droppable + sortable list) ─────────────────────────────

function ZoneColumn({
  zoneDef, sections, catalog, allZones, onToggleEnabled, onDelete, onMoveTo, onPatch,
}: {
  zoneDef: { name: string; label: string };
  sections: EditableSection[];
  catalog: CatalogEntry[];
  allZones: { name: string; label: string }[];
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveTo: (id: string, zone: string) => void;
  onPatch: (id: string, patch: Record<string, any>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${ZONE_ID_PREFIX}${zoneDef.name}` });
  const otherZones = allZones.filter((z) => z.name !== zoneDef.name);

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{zoneDef.label}</p>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`space-y-3 min-h-[88px] rounded-2xl transition-colors ${isOver ? 'bg-[#f0f5ff] ring-2 ring-[#0B2560]/15' : ''}`}
        >
          {sections.length === 0 && (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-8 text-center text-xs text-gray-400">
              Drag a section here, or add one from the library below
            </div>
          )}
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              meta={catalogLookup(catalog, section.sectionType, section.variant)}
              otherZones={otherZones}
              onToggleEnabled={() => onToggleEnabled(section.id)}
              onDelete={() => onDelete(section.id)}
              onMoveTo={(z) => onMoveTo(section.id, z)}
              onPatch={(patch) => onPatch(section.id, patch)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Visual preview modal ─────────────────────────────────────────────────────

function PreviewModal({
  zones, sectionsByZone, catalog, onClose,
}: {
  zones: { name: string; label: string }[];
  sectionsByZone: Record<string, EditableSection[]>;
  catalog: CatalogEntry[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-auto p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full mt-8 mb-8 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-[#0B2560] text-lg flex items-center gap-2">
            <LayoutTemplate size={18} /> Page Layout Preview
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="flex gap-6 items-start">
          {zones.map((z, i) => (
            <div
              key={z.name}
              className="space-y-2"
              style={{ flex: zones.length > 1 ? (i === 0 ? 2 : 1) : 1 }}
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{z.label}</p>
              <div className="border border-gray-100 rounded-2xl p-3 space-y-2 bg-gray-50/50 min-h-[200px]">
                {(sectionsByZone[z.name] ?? []).length === 0 && (
                  <p className="text-xs text-gray-300 italic text-center py-8">Empty</p>
                )}
                {(sectionsByZone[z.name] ?? []).map((s) => {
                  const meta = catalogLookup(catalog, s.sectionType, s.variant);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                        s.enabled ? 'bg-white border border-gray-100 text-[#0B2560] shadow-sm' : 'bg-gray-100 text-gray-400 border border-dashed border-gray-200'
                      }`}
                    >
                      <span>{meta?.icon ?? '📦'}</span>
                      <span className="truncate flex-1">{meta?.label ?? s.sectionType}</span>
                      {!s.enabled && <span className="text-[9px] uppercase tracking-wider">Hidden</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section library ──────────────────────────────────────────────────────────

function SectionLibrary({
  catalog, zones, usedSingletonTypes, onAdd,
}: {
  catalog: CatalogEntry[];
  zones: { name: string; label: string }[];
  usedSingletonTypes: Set<string>;
  onAdd: (entry: CatalogEntry, zone: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const relevant = catalog.filter((c) => c.allowedZones.some((z) => zones.some((zone) => zone.name === z)));

  return (
    <div className="border border-gray-100 rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-[#0B2560]"
      >
        <span className="flex items-center gap-2"><Plus size={15} /> Section Library ({relevant.length} available)</span>
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 p-3 grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {relevant.map((entry) => {
            const alreadyUsed = entry.singleton && usedSingletonTypes.has(entry.sectionType);
            const targetZones = zones.filter((z) => entry.allowedZones.includes(z.name));
            return (
              <div
                key={`${entry.sectionType}:${entry.variant}`}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                  alreadyUsed ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span>{entry.icon}</span>
                  <span className="text-sm font-semibold text-gray-700 truncate">{entry.label}</span>
                  {alreadyUsed && (
                    <span title="Only one per page" className="text-gray-400 shrink-0"><Lock size={11} /></span>
                  )}
                </div>
                {alreadyUsed ? (
                  <span className="text-[10px] font-bold text-gray-400 shrink-0 whitespace-nowrap">Already added</span>
                ) : (
                  <div className="flex gap-1 shrink-0">
                    {targetZones.map((z) => (
                      <button
                        key={z.name}
                        type="button"
                        onClick={() => onAdd(entry, z.name)}
                        className="text-[10px] font-bold text-[#0B2560] bg-[#f6faff] hover:bg-[#0B2560] hover:text-white px-2 py-1.5 rounded-lg transition whitespace-nowrap"
                      >
                        + {targetZones.length > 1 ? z.label : 'Add'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {relevant.length === 0 && (
            <p className="text-xs text-gray-400 italic px-3 py-2 col-span-2">No section types available yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main builder ──────────────────────────────────────────────────────────────

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
  const [previewOpen, setPreviewOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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

  const sectionsByZone = useMemo(() => {
    const map: Record<string, EditableSection[]> = {};
    for (const z of zones) map[z.name] = sections.filter((s) => s.zone === z.name);
    return map;
  }, [sections, zones]);

  const usedSingletonTypes = useMemo(
    () => new Set(sections.map((s) => s.sectionType)),
    [sections]
  );

  const persistReorder = async (zone: string, orderedIds: string[]) => {
    await fetch('/api/admin/sections/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageType, orderedIds }),
    });
  };

  const patchSection = async (id: string, patch: Record<string, any>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await fetch(`/api/admin/sections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  };

  const toggleEnabled = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (section) patchSection(id, { enabled: !section.enabled });
  };

  const deleteSection = async (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/admin/sections/${id}`, { method: 'DELETE' });
  };

  const addSection = async (entry: CatalogEntry, zone: string) => {
    const res = await fetch('/api/admin/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageType, pageId, sectionType: entry.sectionType, variant: entry.variant, zone, content: {} }),
    });
    const json = await res.json();
    if (json.success) setSections((prev) => [...prev, toEditable(json.data)]);
  };

  // Explicit "Move to {zone}" button — the reliable, always-visible way to
  // relocate a section between zones. Drag-and-drop (below) does the same
  // move, plus in-zone reordering; this stays as a fallback for anyone who
  // prefers clicking over dragging, and for touch devices where drag can be
  // fiddly.
  const moveSectionTo = (id: string, targetZone: string) => {
    const section = sections.find((s) => s.id === id);
    if (!section || section.zone === targetZone) return;
    const sourceZone = section.zone;
    const nextSections = sections.map((s) => (s.id === id ? { ...s, zone: targetZone } : s));
    setSections(nextSections);
    patchSection(id, { zone: targetZone });
    persistReorder(targetZone, nextSections.filter((s) => s.zone === targetZone).map((s) => s.id));
    persistReorder(sourceZone, nextSections.filter((s) => s.zone === sourceZone).map((s) => s.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeSection = sections.find((s) => s.id === activeId);
    if (!activeSection) return;

    const sourceZone = activeSection.zone;
    let destZone: string;
    let destIndex: number;

    if (overId.startsWith(ZONE_ID_PREFIX)) {
      destZone = overId.slice(ZONE_ID_PREFIX.length);
      destIndex = sectionsByZone[destZone]?.length ?? 0;
    } else {
      const overSection = sections.find((s) => s.id === overId);
      if (!overSection) return;
      destZone = overSection.zone;
      destIndex = (sectionsByZone[destZone] ?? []).findIndex((s) => s.id === overId);
    }

    if (destZone === sourceZone && overId === activeId) return;

    // Rebuild the full list: pull active out, splice into its new zone/index.
    const withoutActive = sections.filter((s) => s.id !== activeId);
    const destZoneItems = withoutActive.filter((s) => s.zone === destZone);
    const otherItems = withoutActive.filter((s) => s.zone !== destZone);
    const moved = { ...activeSection, zone: destZone };
    destZoneItems.splice(Math.max(0, Math.min(destIndex, destZoneItems.length)), 0, moved);

    const nextSections = [...otherItems, ...destZoneItems];
    setSections(nextSections);

    if (destZone !== sourceZone) {
      patchSection(activeId, { zone: destZone });
      persistReorder(sourceZone, nextSections.filter((s) => s.zone === sourceZone).map((s) => s.id));
    }
    persistReorder(destZone, destZoneItems.map((s) => s.id));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
        <Loader size={14} className="animate-spin" /> Loading sections…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Drag a section to reorder it, or drag it across into the other zone.</p>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
        >
          <LayoutTemplate size={13} /> Preview Layout
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 items-start">
          {zones.map((zoneDef) => (
            <ZoneColumn
              key={zoneDef.name}
              zoneDef={zoneDef}
              sections={sectionsByZone[zoneDef.name] ?? []}
              catalog={catalog}
              allZones={zones}
              onToggleEnabled={toggleEnabled}
              onDelete={deleteSection}
              onMoveTo={moveSectionTo}
              onPatch={patchSection}
            />
          ))}
        </div>
      </DndContext>

      <SectionLibrary
        catalog={catalog}
        zones={zones}
        usedSingletonTypes={usedSingletonTypes}
        onAdd={addSection}
      />

      {previewOpen && (
        <PreviewModal
          zones={zones}
          sectionsByZone={sectionsByZone}
          catalog={catalog}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
