"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader, AlertCircle, CheckCircle, Film } from "lucide-react";

interface VideoUploadProps {
  onUpload: (data: { url: string; publicId: string }) => void;
  label?: string;
  currentUrl?: string;
}

// Thin video counterpart to ImageUpload.tsx, modeled 1:1 on its
// drop-zone/progress/error structure but posting to the existing
// /api/admin/services/upload-video route (50MB, mp4/webm/quicktime/avi) —
// no "Choose from Media Library" picker, since MediaGalleryModal is
// image-only.
export default function VideoUpload({ onUpload, label = "Upload Video", currentUrl }: VideoUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>(currentUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError("");
    setSuccess(false);

    const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    if (!validTypes.includes(file.type)) {
      setError(`Invalid type: ${file.type}. Allowed: MP4, WebM, MOV, AVI`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max 50MB`);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/services/upload-video", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Upload failed");
        return;
      }
      setPreviewSrc(data.data.secure_url);
      setSuccess(true);
      onUpload({ url: data.data.secure_url, publicId: data.data.public_id });
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-2">{label}</label>

      {previewSrc && (
        <div className="relative mb-4">
          <video src={previewSrc} controls className="w-full h-40 bg-gray-100 rounded-xl object-cover" />
          {success && (
            <div className="absolute inset-0 bg-green-500/20 rounded-xl flex items-center justify-center pointer-events-none">
              <div className="bg-white px-4 py-2 rounded-xl shadow-lg flex gap-2 items-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-semibold text-sm">Video set!</span>
              </div>
            </div>
          )}
          {!loading && (
            <button
              type="button"
              onClick={() => { setPreviewSrc(""); setSuccess(false); setError(""); onUpload({ url: "", publicId: "" }); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <div
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
          loading ? "bg-gray-50 border-gray-300 cursor-not-allowed" : "border-blue-300 hover:border-blue-500 bg-blue-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          className="hidden"
          disabled={loading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
        />
        {loading ? (
          <>
            <Loader className="w-10 h-10 mx-auto mb-2 text-blue-500 animate-spin" />
            <p className="text-blue-600 font-semibold text-sm">Uploading…</p>
          </>
        ) : (
          <>
            <Film className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-700 font-semibold text-sm">Drop video here or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">Max 50MB · MP4, WebM, MOV, AVI</p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-semibold text-sm">Upload Failed</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
