"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader, AlertCircle, CheckCircle } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  onUpload: (data: {
    url: string;
    publicId: string;
  }) => void;
  label?: string;
  preview?: boolean;
  maxSize?: number;
  accept?: string;
  folder?: string;
}

export default function ImageUpload({
  onUpload,
  label = "Upload Image",
  preview = true,
  maxSize = 5, // MB
  accept = "image/*",
  folder = "dr-youth-clinic/services",
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError("");
    setSuccess(false);
    setUploadProgress(0);

    // ============ VALIDATION ============
    console.log("📁 File selected:", {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type,
    });

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      const errorMsg = `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`;
      setError(errorMsg);
      console.warn("❌", errorMsg);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      const errorMsg = `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds ${maxSize}MB limit`;
      setError(errorMsg);
      console.warn("❌", errorMsg);
      return;
    }

    // Show preview
    if (preview) {
      console.log("🖼️ Generating preview...");
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // ============ UPLOAD ============
    setLoading(true);
    console.log("📤 Starting upload to Cloudinary...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 20;
        });
      }, 200);

      const response = await fetch("/api/admin/services/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(95);

      const data = await response.json();

      console.log("📊 Upload response:", data);

      if (!data.success) {
        setError(data.message || "Upload failed");
        setPreviewUrl("");
        console.error("❌", data.message);
        setLoading(false);
        return;
      }

      console.log("✅ Upload successful!");
      console.log("🔗 Image URL:", data.data.secure_url);
      console.log("📋 Public ID:", data.data.public_id);

      setUploadProgress(100);
      setSuccess(true);

      // Call callback
      onUpload({
        url: data.data.secure_url,
        publicId: data.data.public_id,
      });

      // Reset success message after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setUploadProgress(0);
      }, 2000);
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      setError(err.message || "Upload failed. Please try again.");
      setPreviewUrl("");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log("📤 Files dropped");
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemovePreview = () => {
    setPreviewUrl("");
    setSuccess(false);
    setError("");
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-2">{label}</label>

      {/* PREVIEW */}
      {previewUrl && (
        <div className="relative mb-4">
          <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>

          {/* SUCCESS BADGE */}
          {success && (
            <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
              <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex gap-2 items-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-semibold">Uploaded!</span>
              </div>
            </div>
          )}

          {/* PROGRESS BAR */}
          {loading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* REMOVE BUTTON */}
          {!loading && (
            <button
              type="button"
              onClick={handleRemovePreview}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* DROP ZONE */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
          loading
            ? "bg-gray-50 border-gray-300 cursor-not-allowed"
            : "border-blue-300 hover:border-blue-500 bg-blue-50 cursor-pointer"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
          disabled={loading}
        />

        {loading ? (
          <>
            <Loader className="w-12 h-12 mx-auto mb-2 text-blue-500 animate-spin" />
            <p className="text-blue-600 font-semibold">
              Uploading... {Math.round(uploadProgress)}%
            </p>
            <p className="text-sm text-blue-500 mt-1">
              Please wait, optimizing your image
            </p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-700 font-semibold">
              Drop image here or click to upload
            </p>
            <p className="text-sm text-gray-500">
              Max {maxSize}MB • PNG, JPG, WEBP, GIF
            </p>
          </>
        )}
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-semibold text-sm">Upload Failed</p>
            <p className="text-red-600 text-sm">{error}</p>
            <p className="text-xs text-red-500 mt-1">
              💡 Check browser console (F12) for more details
            </p>
          </div>
        </div>
      )}

      {/* INFO */}
      <p className="text-xs text-gray-500 mt-2">
        💡 Supported formats: JPEG, PNG, WebP, GIF (max {maxSize}MB)
      </p>
    </div>
  );
}
