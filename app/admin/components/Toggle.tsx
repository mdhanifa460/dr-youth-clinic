"use client";

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  preview,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  preview?: { on: string; off: string };
  disabled?: boolean;
}) {
  return (
    <div className="px-6 py-5 flex items-start gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/30 disabled:opacity-50 ${
          checked ? "bg-[#0B2560]" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0B2560]">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        {preview && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preview:</span>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                checked
                  ? "bg-[#0B2560] text-white border-[#0B2560]"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              {checked ? preview.on : preview.off}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
