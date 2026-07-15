'use client';

export default function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
        active
          ? 'bg-[#0B2560] text-white shadow-md'
          : 'bg-[#f6faff] text-gray-600 hover:bg-[#e8eff7]'
      }`}
    >
      {label}
    </button>
  );
}
