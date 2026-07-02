"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader, AlertCircle, CheckCircle, Images } from "lucide-react";
import MediaGalleryModal from "./MediaGalleryModal";

interface ImageUploadProps {
  onUpload: (data: { url: string; publicId: string }) => void;
  label?: string;
  preview?: boolean;
  maxSize?: number;
  accept?: string;
  folder?: string;
  currentPublicId?: string;
}

async function deleteFromCloudinary(publicId: string) {
  try {
    await fetch('/api/admin/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId }),
    });
  } catch {
    // silent — don't block the UI if cleanup fails
  }
}

export default function ImageUpload({
  onUpload,
  label = "Upload Image",
  preview = true,
  maxSize = 5,
  accept = "image/*",
  folder = "dr-youth-clinic/services",
  currentPublicId,
}: ImageUploadProps) {
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);
  const [previewSrc, setPreviewSrc]     = useState<string>("");
  const [uploadProgress, setProgress]   = useState(0);
  const [galleryOpen, setGalleryOpen]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError("");
    setSuccess(false);
    setProgress(0);

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError(`Invalid type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`);
      return;
    }
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max ${maxSize}MB`);
      return;
    }

    if (preview) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewSrc(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setLoading(true);
    const oldPublicId = currentPublicId;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const tick = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + Math.random() * 20));
      }, 200);

      const res  = await fetch("/api/admin/services/upload", { method: "POST", body: formData });
      clearInterval(tick);
      setProgress(95);

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Upload failed");
        setPreviewSrc("");
        return;
      }

      setProgress(100);
      setSuccess(true);
      onUpload({ url: data.data.secure_url, publicId: data.data.public_id });

      // Delete the old image from Cloudinary after successful upload
      if (oldPublicId) deleteFromCloudinary(oldPublicId);

      setTimeout(() => { setSuccess(false); setProgress(0); }, 2500);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
      setPreviewSrc("");
    } finally {
      setLoading(false);
    }
  };

  const handleGallerySelect = (img: { url: string; publicId: string }) => {
    setPreviewSrc(img.url);
    setSuccess(true);
    onUpload(img);
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-2">{label}</label>

      {/* Preview */}
      {previewSrc && (
        <div className="relative mb-4">
          <div className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden">
            <img src={previewSrc} alt="Preview" className="w-full h-full object-cover" />
          </div>
          {success && (
            <div className="absolute inset-0 bg-green-500/20 rounded-xl flex items-center justify-center">
              <div className="bg-white px-4 py-2 rounded-xl shadow-lg flex gap-2 items-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-semibold text-sm">Image set!</span>
              </div>
            </div>
          )}
          {loading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
          {!loading && (
            <button type="button" onClick={() => { setPreviewSrc(""); setSuccess(false); setError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
          loading ? "bg-gray-50 border-gray-300 cursor-not-allowed" : "border-blue-300 hover:border-blue-500 bg-blue-50"
        }`}
      >
        <input ref={fileInputRef} type="file" accept={accept} className="hidden" disabled={loading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

        {loading ? (
          <>
            <Loader className="w-10 h-10 mx-auto mb-2 text-blue-500 animate-spin" />
            <p className="text-blue-600 font-semibold text-sm">Uploading… {Math.round(uploadProgress)}%</p>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-700 font-semibold text-sm">Drop image here or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">Max {maxSize}MB · PNG, JPG, WEBP, GIF</p>
          </>
        )}
      </div>

      {/* Gallery button */}
      <button type="button" onClick={() => setGalleryOpen(true)}
        className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">
        <Images size={15} className="text-[#0B2560]" />
        Choose from Media Library
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-semibold text-sm">Upload Failed</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      <MediaGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleGallerySelect}
        defaultFolder={folder}
      />
    </div>
  );
}
