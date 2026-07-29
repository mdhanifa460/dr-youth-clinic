import mongoose, { Schema, Document } from "mongoose";

// Phase 2 of the Enterprise Experience & Theme Engine — the first
// DB-backed asset registry in this codebase (confirmed during design: the
// existing "Media Library" at app/admin/components/MediaGalleryModal.tsx
// is a live Cloudinary folder browser with zero metadata, not a model).
// Files continue to live in Cloudinary exactly as every other upload in
// this codebase does; this model only catalogs them.
export const ASSET_CATEGORIES = [
  "ambient", "skin", "hair", "wellness", "beauty", "corporate", "particle",
] as const;

export interface IAnimationAsset extends Document {
  name: string;
  category: string;
  type: "lottie" | "rive" | "image" | "video";
  // For lottie/rive: a raw source URL (same convention Banner.lottieUrl
  // already used before this library existed — Cloudinary doesn't need a
  // dedicated upload flow for these here since Phase 1's banner editor
  // already just pastes a URL). For image/video: a real Cloudinary upload
  // via the existing ImageUpload/VideoUpload components.
  file: { url: string; publicId: string };
  // Always a real image (never a raw Lottie/Rive file) so the admin picker
  // can show a preview without ever executing/rendering the animation
  // itself in a list view.
  previewImage: { url: string; publicId: string };
  version: number;
  status: "draft" | "active" | "deprecated";
  tags: string[];
  performanceRating: "light" | "medium" | "heavy";
  createdAt: Date;
  updatedAt: Date;
}

const AnimationAssetSchema = new Schema<IAnimationAsset>(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    category: { type: String, enum: ASSET_CATEGORIES, required: true },
    type: { type: String, enum: ["lottie", "rive", "image", "video"], required: true },
    file: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    previewImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ["draft", "active", "deprecated"], default: "draft" },
    tags: { type: [String], default: [] },
    performanceRating: { type: String, enum: ["light", "medium", "heavy"], default: "light" },
  },
  { timestamps: true }
);

AnimationAssetSchema.index({ status: 1, category: 1 });
AnimationAssetSchema.index({ tags: 1 });

export const AnimationAsset = mongoose.models.AnimationAsset || mongoose.model<IAnimationAsset>("AnimationAsset", AnimationAssetSchema);
