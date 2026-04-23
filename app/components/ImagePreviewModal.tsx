"use client";

import { useEffect } from "react";
import BeforeAfterSlider from "./BeforeAfterSlider";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  before: string;
  after: string;
};

export default function ImagePreviewModal({
  isOpen,
  onClose,
  before,
  after,
}: Props) {
  // ESC close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">

      {/* CLOSE BUTTON */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white text-3xl"
      >
        ✕
      </button>

      {/* CONTENT */}
      <div className="w-full max-w-4xl h-[500px] px-4">
        <BeforeAfterSlider before={before} after={after} />
      </div>

      {/* CLICK OUTSIDE */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />

    </div>
  );
}