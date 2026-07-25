"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from "lucide-react";

type LinkType = "custom" | "services" | "locations" | "anchor";

type NavChild = { id: string; label: string; href: string; order: number };
type NavItem = {
  id: string;
  label: string;
  linkType: LinkType;
  href: string;
  order: number;
  visible: boolean;
  children: NavChild[];
};

const LINK_TYPE_OPTIONS: [LinkType, string, string][] = [
  ["custom", "Custom Link", "A fixed path you type in, e.g. /offers"],
  ["services", "Services (auto)", "Auto-resolves to the visitor's current/detected city's Services page — no URL to set"],
  ["anchor", "Homepage Section", "Scrolls to a section on the homepage by its id, e.g. \"contact\""],
  ["locations", "Locations Dropdown", "The fixed 4-city dropdown — reserve for one item only"],
];

// Mirrors app/components/Navbar.tsx's FALLBACK_NAV_ITEMS and the Settings
// schema default — shown here so a Settings doc that predates this field
// (schema defaults only apply at document creation, not retroactively)
// still shows the current live menu, pre-filled and editable, instead of a
// blank list.
const DEFAULT_ITEMS: NavItem[] = [
  { id: "home", label: "Home", linkType: "custom", href: "/", order: 0, visible: true, children: [] },
  { id: "services", label: "Services", linkType: "services", href: "", order: 1, visible: true, children: [] },
  { id: "doctors", label: "Doctors", linkType: "custom", href: "/doctors", order: 2, visible: true, children: [] },
  { id: "about", label: "About", linkType: "custom", href: "/about", order: 3, visible: true, children: [] },
  { id: "results", label: "Results", linkType: "custom", href: "/results", order: 4, visible: true, children: [] },
  { id: "stories", label: "Stories", linkType: "custom", href: "/web-stories", order: 5, visible: true, children: [] },
  { id: "blog", label: "Blog", linkType: "custom", href: "/blog", order: 6, visible: true, children: [] },
  { id: "offers", label: "Offers", linkType: "custom", href: "/offers", order: 7, visible: true, children: [] },
  { id: "contact", label: "Contact", linkType: "anchor", href: "contact", order: 8, visible: true, children: [] },
  { id: "locations", label: "Locations", linkType: "locations", href: "", order: 9, visible: true, children: [] },
];

function uid() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 12);
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((it, i) => ({ ...(it as any), order: i }));
}

export default function NavigationSettingsPage() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        const loaded = d.success && d.data?.navigation?.items?.length ? d.data.navigation.items : DEFAULT_ITEMS;
        setItems([...loaded].sort((a: NavItem, b: NavItem) => a.order - b.order));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const setItem = (i: number, patch: Partial<NavItem>) => {
    const next = [...items]; next[i] = { ...next[i], ...patch }; setItems(next);
  };
  const reorder = (i: number, dir: -1 | 1) => setItems((prev) => move(prev, i, i + dir));
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, order: idx })));
  const addItem = () => setItems((prev) => [...prev, { id: uid(), label: "New Link", linkType: "custom", href: "/", order: prev.length, visible: true, children: [] }]);

  const setChild = (i: number, ci: number, patch: Partial<NavChild>) => {
    const children = [...items[i].children]; children[ci] = { ...children[ci], ...patch };
    setItem(i, { children });
  };
  const addChild = (i: number) => {
    const children = [...items[i].children, { id: uid(), label: "New Item", href: "/", order: items[i].children.length }];
    setItem(i, { children });
    setExpanded((e) => ({ ...e, [items[i].id]: true }));
  };
  const removeChild = (i: number, ci: number) => {
    const children = items[i].children.filter((_, idx) => idx !== ci).map((c, idx) => ({ ...c, order: idx }));
    setItem(i, { children });
  };
  const reorderChild = (i: number, ci: number, dir: -1 | 1) => setItem(i, { children: move(items[i].children, ci, ci + dir) });

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navigation: { items } }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Save failed"); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Navigation Menu</h1>
            <p className="text-gray-400 text-sm mt-0.5">Control the header menu — order, labels, links, and dropdown submenus.</p>
          </div>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm shrink-0">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={14} /> Settings saved
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="space-y-3">
          {items.map((item, i) => {
            const isOpen = !!expanded[item.id];
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-1.5 shrink-0">
                    <button onClick={() => reorder(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-20"><ArrowUp size={14} /></button>
                    <button onClick={() => reorder(i, 1)} disabled={i === items.length - 1} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-20"><ArrowDown size={14} /></button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <input value={item.label} onChange={(e) => setItem(i, { label: e.target.value })}
                        placeholder="Label" className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-[#0B2560] focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                      <select value={item.linkType} onChange={(e) => setItem(i, { linkType: e.target.value as LinkType })}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
                        {LINK_TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>

                    {(item.linkType === "custom" || item.linkType === "anchor") && (
                      <input value={item.href} onChange={(e) => setItem(i, { href: e.target.value })}
                        placeholder={item.linkType === "anchor" ? "Section id, e.g. contact" : "/path or https://..."}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                    )}
                    <p className="text-[11px] text-gray-400">{LINK_TYPE_OPTIONS.find(([v]) => v === item.linkType)?.[2]}</p>

                    {item.linkType !== "locations" && (
                      <div>
                        <button onClick={() => setExpanded((e) => ({ ...e, [item.id]: !isOpen }))}
                          className="text-xs font-semibold text-[#0B2560] flex items-center gap-1 hover:underline">
                          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          Dropdown items {item.children.length > 0 && `(${item.children.length})`}
                        </button>
                        {isOpen && (
                          <div className="mt-2.5 space-y-2 pl-3 border-l-2 border-gray-100">
                            {item.children.map((child, ci) => (
                              <div key={child.id} className="flex items-center gap-2">
                                <div className="flex flex-col gap-0.5">
                                  <button onClick={() => reorderChild(i, ci, -1)} disabled={ci === 0} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-20"><ArrowUp size={11} /></button>
                                  <button onClick={() => reorderChild(i, ci, 1)} disabled={ci === item.children.length - 1} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-20"><ArrowDown size={11} /></button>
                                </div>
                                <input value={child.label} onChange={(e) => setChild(i, ci, { label: e.target.value })}
                                  placeholder="Label" className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                                <input value={child.href} onChange={(e) => setChild(i, ci, { href: e.target.value })}
                                  placeholder="/path" className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                                <button onClick={() => removeChild(i, ci)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
                              </div>
                            ))}
                            <button onClick={() => addChild(i)} className="text-[11px] text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
                              <Plus size={10} /> Add dropdown item
                            </button>
                            {item.children.length > 0 && (
                              <p className="text-[10px] text-gray-400 italic">When this item has dropdown items, its own link (above) still works — it becomes a click-to-open menu instead.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={item.visible} onChange={(e) => setItem(i, { visible: e.target.checked })} />
                      Visible
                    </label>
                    <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={addItem} className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#0B2560]/40 text-gray-400 hover:text-[#0B2560] font-semibold text-sm py-3.5 rounded-xl transition">
          <Plus size={16} /> Add Menu Item
        </button>

      </div>
    </div>
  );
}
