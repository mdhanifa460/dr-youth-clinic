"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader } from "lucide-react";
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
}

export default function ImageUpload({
  onUpload,
  label = "Upload Image",
  preview = true,
  maxSize = 5, // MB
  accept = "image/*",
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError("");

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Show preview
    if (preview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Upload to server
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "dr-youth-clinic/services");

      const response = await fetch("/api/admin/services/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Upload failed");
        setPreviewUrl("");
        return;
      }

      onUpload({
        url: data.data.secure_url,
        publicId: data.data.public_id,
      });
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setPreviewUrl("");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-2">{label}</label>

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
          <button
            type="button"
            onClick={() => {
              setPreviewUrl("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition bg-blue-50"
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
        />

        {loading ? (
          <>
            <Loader className="w-12 h-12 mx-auto mb-2 text-blue-500 animate-spin" />
            <p className="text-blue-600 font-semibold">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-700 font-semibold">
              Drop image here or click to upload
            </p>
            <p className="text-sm text-gray-500">
              Max {maxSize}MB • PNG, JPG, WEBP
            </p>
          </>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
