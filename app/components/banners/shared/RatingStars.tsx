import { Star } from "lucide-react";

export default function RatingStars({ value, reviewCount }: { value: number; reviewCount?: number }) {
  if (!value) return null;
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={15}
            className={i < rounded ? "fill-[#F5A623] text-[#F5A623]" : "fill-gray-200 text-gray-200"}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-[#0B2560]">{value.toFixed(1)}</span>
      {!!reviewCount && <span className="text-xs text-gray-400">({reviewCount.toLocaleString()})</span>}
    </div>
  );
}
