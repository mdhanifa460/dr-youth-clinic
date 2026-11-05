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
          ? 'bg-primary text-white shadow-md'
          : 'bg-canvas text-gray-600 hover:bg-line'
      }`}
    >
      {label}
    </button>
  );
}
