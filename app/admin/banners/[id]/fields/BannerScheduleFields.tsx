"use client";

export default function BannerScheduleFields({ banner, set }: { banner: any; set: (patch: Record<string, any>) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-bold text-gray-700">Schedule &amp; Priority</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date (optional)</label>
          <input type="date" value={banner.startDate ? banner.startDate.slice(0, 10) : ""} onChange={(e) => set({ startDate: e.target.value || null })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date (optional)</label>
          <input type="date" value={banner.endDate ? banner.endDate.slice(0, 10) : ""} onChange={(e) => set({ endDate: e.target.value || null })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Priority (higher wins ties)</label>
          <input type="number" value={banner.priority} onChange={(e) => set({ priority: Number(e.target.value) || 0 })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
          <select value={banner.status} onChange={(e) => set({ status: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>
    </div>
  );
}
