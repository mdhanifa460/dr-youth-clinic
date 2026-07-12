"use client";

import { useState } from "react";
import { X, BookmarkPlus, Loader } from "lucide-react";

export default function SaveTemplateModal({
  isOpen,
  onClose,
  onSave,
  defaultName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  defaultName?: string;
}) {
  const [name, setName] = useState(defaultName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const submit = async () => {
    if (!name.trim()) {
      setError("Give this template a name");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(name.trim());
      setName("");
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F5A623]/10 flex items-center justify-center">
              <BookmarkPlus size={16} className="text-[#F5A623]" />
            </div>
            <h3 className="font-bold text-[#0B2560]">Save as Template</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Reuse this section's current content on future pages via "Insert Template."
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hair PRP Hero"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
        />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-[#0B2560] text-white font-semibold hover:bg-[#0d2d73] transition disabled:opacity-50"
          >
            {saving ? <Loader size={13} className="animate-spin" /> : <BookmarkPlus size={13} />}
            {saving ? "Saving…" : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
