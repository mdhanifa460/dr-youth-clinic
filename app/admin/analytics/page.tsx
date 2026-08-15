"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, Loader, Info } from "lucide-react";
import { PREDEFINED_EVENTS } from "@/app/lib/analytics/eventRegistry";
import { CUSTOM_EVENT_TRIGGER_TYPE_LABELS } from "@/app/lib/analytics/customEventOptions";

const TABS = ["Overview", "Event Library", "Custom Events", "Key Events"] as const;
type Tab = (typeof TABS)[number];

const CATEGORY_STYLES: Record<string, string> = {
  conversion: "bg-green-50 text-green-600",
  lead: "bg-blue-50 text-blue-600",
  engagement: "bg-amber-50 text-amber-600",
  attribution: "bg-purple-50 text-purple-600",
  offer: "bg-pink-50 text-pink-600",
  ai: "bg-indigo-50 text-indigo-600",
};

interface CustomEventRow {
  _id: string;
  name: string;
  displayName: string;
  triggerType: string;
  enabled: boolean;
  isKeyEvent: boolean;
}

export default function AnalyticsEventManagerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [customEvents, setCustomEvents] = useState<CustomEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [keyEventNames, setKeyEventNames] = useState<string[]>([]);
  const [savingKeyEvents, setSavingKeyEvents] = useState(false);
  const [keyEventsSaved, setKeyEventsSaved] = useState(false);

  useEffect(() => {
    loadCustomEvents();
    loadKeyEventNames();
  }, []);

  async function loadCustomEvents() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/analytics/custom-events");
      const data = await res.json();
      if (data.success) setCustomEvents(data.data);
    } finally {
      setLoading(false);
    }
  }

  async function loadKeyEventNames() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    if (data.success) setKeyEventNames(data.data?.analyticsEventManager?.keyEventNames || []);
  }

  async function toggleEnabled(row: CustomEventRow) {
    setCustomEvents((prev) => prev.map((e) => (e._id === row._id ? { ...e, enabled: !e.enabled } : e)));
    await fetch(`/api/admin/analytics/custom-events/${row._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !row.enabled }),
    });
  }

  async function toggleCustomKeyEvent(row: CustomEventRow) {
    setCustomEvents((prev) => prev.map((e) => (e._id === row._id ? { ...e, isKeyEvent: !e.isKeyEvent } : e)));
    await fetch(`/api/admin/analytics/custom-events/${row._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isKeyEvent: !row.isKeyEvent }),
    });
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this custom event? This can't be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/analytics/custom-events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) setCustomEvents((prev) => prev.filter((e) => e._id !== id));
    } finally {
      setDeleting(null);
    }
  }

  function togglePredefinedKeyEvent(name: string) {
    setKeyEventNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
    setKeyEventsSaved(false);
  }

  async function saveKeyEventNames() {
    setSavingKeyEvents(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyticsEventManager: { keyEventNames } }),
      });
      const data = await res.json();
      if (data.success) setKeyEventsSaved(true);
    } finally {
      setSavingKeyEvents(false);
    }
  }

  const enabledCount = customEvents.filter((e) => e.enabled).length;
  const keyCustomCount = customEvents.filter((e) => e.isKeyEvent).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📈 Analytics Event Manager</h1>
        <p className="text-gray-500 text-sm mt-1">
          Predefined events (protected, developer-controlled) plus admin-configurable Custom Events — both flow through the same GTM/GA4 pipeline as{" "}
          <Link href="/admin/settings/analytics" className="text-[#0B2560] font-semibold hover:underline">Settings → Analytics &amp; Tracking</Link>.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 -mb-px">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === tab ? "border-[#0B2560] text-[#0B2560]" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-800">{PREDEFINED_EVENTS.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Predefined events</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-800">{enabledCount} / {customEvents.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Custom events enabled</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-800">{keyEventNames.length + keyCustomCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Key events marked</p>
          </div>
          <Link href="/admin/settings/analytics" className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#0B2560]/30 transition">
            <p className="text-sm font-bold text-[#0B2560]">GTM / GA4 setup →</p>
            <p className="text-xs text-gray-500 mt-0.5">Manage tags &amp; IDs</p>
          </Link>
        </div>
      )}

      {activeTab === "Event Library" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-start gap-2">
            <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              These events already fire in production and feed real GA4 reports. They're read-only here on purpose — renaming one would silently break historical reporting continuity.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Params</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PREDEFINED_EVENTS.map((ev) => (
                  <tr key={ev.name}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-800">{ev.name}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${CATEGORY_STYLES[ev.category] || "bg-gray-100 text-gray-500"}`}>
                        {ev.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{ev.description}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{ev.params.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "Custom Events" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Admin-configured tracking — no code deploy needed.</p>
            <Link href="/admin/analytics/custom-events/new"
              className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition">
              <Plus size={15} /> Add Custom Event
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader className="animate-spin text-gray-300" size={24} /></div>
          ) : customEvents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-4xl mb-3">📈</p>
              <p className="text-gray-500 font-semibold">No custom events yet — add your first one.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3">Event</th>
                      <th className="px-5 py-3">Trigger</th>
                      <th className="px-5 py-3">Enabled</th>
                      <th className="px-5 py-3">Key Event</th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customEvents.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-gray-800">{row.displayName}</p>
                          <p className="font-mono text-xs text-gray-400">{row.name}</p>
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {CUSTOM_EVENT_TRIGGER_TYPE_LABELS[row.triggerType as keyof typeof CUSTOM_EVENT_TRIGGER_TYPE_LABELS] || row.triggerType}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggleEnabled(row)}
                            className={`w-10 h-5.5 rounded-full transition relative ${row.enabled ? "bg-[#0B2560]" : "bg-gray-200"}`}
                          >
                            <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${row.enabled ? "translate-x-[19px]" : "translate-x-0.5"}`} />
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggleCustomKeyEvent(row)}
                            className={`text-lg ${row.isKeyEvent ? "opacity-100" : "opacity-25 hover:opacity-60"} transition`}
                            title={row.isKeyEvent ? "Marked as Key Event" : "Not a Key Event"}
                          >
                            ⭐
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/analytics/custom-events/${row._id}`} className="p-1.5 text-gray-400 hover:text-[#0B2560] hover:bg-gray-100 rounded-lg transition">
                              <Edit size={14} />
                            </Link>
                            <button onClick={() => deleteEvent(row._id)} disabled={deleting === row._id}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "Key Events" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>
              Marking an event as a Key Event here does not automatically create a GA4 conversion. It flags the event for your own reference and (for Custom Events only) adds an <code className="font-mono bg-amber-100 px-1 rounded">is_key_event</code> parameter to the tracking data, which you can use to build a GTM trigger. To actually register a Key Event in GA4 itself, go to <strong>GA4 → Admin → Events</strong> and mark it there, using the exact event name shown below.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700">Predefined Events</p>
              <button
                onClick={saveKeyEventNames}
                disabled={savingKeyEvents}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${keyEventsSaved ? "bg-green-600 text-white" : "bg-[#0B2560] text-white hover:bg-[#0d2d72]"} disabled:opacity-50`}
              >
                {savingKeyEvents ? "Saving…" : keyEventsSaved ? "Saved" : "Save"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PREDEFINED_EVENTS.map((ev) => (
                <label key={ev.name} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                  <input
                    type="checkbox"
                    checked={keyEventNames.includes(ev.name)}
                    onChange={() => togglePredefinedKeyEvent(ev.name)}
                  />
                  <span className="font-mono text-xs">{ev.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <p className="text-sm font-bold text-gray-700">Custom Events</p>
            <p className="text-xs text-gray-400">Toggle the ⭐ on the Custom Events tab for each event — changes save immediately.</p>
            {customEvents.length === 0 ? (
              <p className="text-sm text-gray-400">No custom events yet.</p>
            ) : (
              <div className="space-y-1">
                {customEvents.map((row) => (
                  <div key={row._id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-700">{row.displayName} <span className="font-mono text-xs text-gray-400">({row.name})</span></span>
                    <span className={row.isKeyEvent ? "opacity-100" : "opacity-25"}>⭐</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
