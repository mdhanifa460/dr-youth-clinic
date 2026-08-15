"use client";

import { Loader, X } from "lucide-react";

export default function AssetPickerModal({
  open, onClose, assetPickerType, libraryLoading, libraryAssets, onPick,
}: {
  open: boolean;
  onClose: () => void;
  assetPickerType: "lottie" | "rive";
  libraryLoading: boolean;
  libraryAssets: any[];
  onPick: (asset: any) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0B2560] text-lg">Pick from Animation Library</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {libraryLoading ? (
          <div className="flex justify-center py-10"><Loader className="animate-spin text-gray-300" size={22} /></div>
        ) : libraryAssets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            No active {assetPickerType === "lottie" ? "Lottie" : "Rive"} assets yet. Add one in the{" "}
            <a href="/admin/animation-library/new" target="_blank" rel="noopener noreferrer" className="text-[#0B2560] font-semibold underline">Animation Library</a>.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {libraryAssets.map((a) => (
              <button
                key={a._id}
                type="button"
                onClick={() => onPick(a)}
                className="text-left rounded-xl border border-gray-200 hover:border-[#0B2560]/40 overflow-hidden transition"
              >
                <div className="relative aspect-video bg-gray-100">
                  {a.previewImage?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.previewImage.url} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-700 truncate">{a.name}</p>
                  <p className="text-[10px] text-gray-400">{a.category} · {a.usageCount} use{a.usageCount !== 1 ? "s" : ""}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
