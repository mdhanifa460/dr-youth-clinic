"use client";

// AI Photo Capture module (AI Beauty Journey, Module 3) — live camera
// capture with a positioning overlay, reusing the same rate-limited
// Cloudinary upload route the existing "photo" question type already uses
// (app/api/assessment-photo-upload) rather than a second upload path.
//
// Camera access is optional-enhancement, not a requirement: getUserMedia
// can fail (denied permission, no camera, insecure context, unsupported
// browser) for a meaningful share of real patients, so a plain file-picker
// fallback is always visible, and skipping the whole step is always
// allowed — never make a photo mandatory to proceed with a treatment
// journey.
import { useEffect, useRef, useState } from "react";

export interface CapturedPhoto {
  url: string;
  publicId?: string;
  angle: string;
}

async function uploadPhoto(fileOrBlob: File | Blob): Promise<{ url: string; publicId?: string }> {
  const formData = new FormData();
  formData.append("file", fileOrBlob, "photo.jpg");
  const res = await fetch("/api/assessment-photo-upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload failed");
  return { url: data.data.secure_url, publicId: data.data.public_id };
}

function CameraCapture({ onCaptured, onCameraUnavailable }: { onCaptured: (blob: Blob) => void; onCameraUnavailable: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      })
      .catch(() => onCameraUnavailable());

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror horizontally to match what the patient saw in the preview
    // (getUserMedia's front camera feed is mirrored by the CSS below, but
    // the raw video frame isn't) — otherwise the captured photo looks
    // flipped compared to what they just confirmed looked right.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) onCaptured(blob); }, "image/jpeg", 0.92);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] max-w-xs mx-auto">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
      {/* Positioning overlay — oval guide + instruction, purely visual (no
          face-detection), same spirit as a passport-photo capture UI. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-[62%] aspect-[3/4] rounded-[50%] border-2 border-white/70 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
      </div>
      <p className="absolute top-3 inset-x-0 text-center text-white text-xs font-semibold px-4">
        Center your face in the oval · good, even lighting works best
      </p>
      {ready && (
        <button
          type="button"
          onClick={capture}
          aria-label="Capture photo"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-white/40 shadow-lg active:scale-95 transition-transform"
        />
      )}
    </div>
  );
}

export default function PhotoCaptureScreen({
  goalLabel,
  onDone,
}: {
  goalLabel: string;
  onDone: (photos: CapturedPhoto[]) => void;
}) {
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (fileOrBlob: File | Blob) => {
    setUploading(true);
    setError("");
    try {
      const { url, publicId } = await uploadPhoto(fileOrBlob);
      setCaptured({ url, publicId, angle: "front" });
    } catch (err: any) {
      setError(err.message || "Upload failed — please try again or skip this step.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="py-6 md:py-10">
      <div className="text-center mb-7">
        <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
          {goalLabel} · Photo (optional)
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">Add a photo for sharper AI observations</h2>
        <p className="text-gray-500 text-sm md:text-base max-w-sm mx-auto">
          Completely optional. Used only to generate general observations for you — never a diagnosis, and never shared without your consent.
        </p>
      </div>

      {captured ? (
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={captured.url} alt="Captured" className="w-48 h-64 rounded-3xl object-cover shadow-md" />
          <button type="button" onClick={() => setCaptured(null)} className="text-xs font-semibold text-red-500 hover:text-red-700">
            Retake photo
          </button>
        </div>
      ) : uploading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <span className="w-8 h-8 border-2 border-[#0B2560]/20 border-t-[#0B2560] rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Uploading…</p>
        </div>
      ) : cameraAvailable ? (
        <CameraCapture onCaptured={handleUpload} onCameraUnavailable={() => setCameraAvailable(false)} />
      ) : (
        <div className="max-w-xs mx-auto bg-white rounded-3xl border-2 border-dashed border-gray-200 px-6 py-10 text-center">
          <p className="text-4xl mb-3">📷</p>
          <p className="text-sm font-bold text-[#0B2560] mb-1">Camera unavailable</p>
          <p className="text-xs text-gray-500">Upload a photo from your gallery instead.</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 text-center mt-3">{error}</p>}

      <div className="mt-8 max-w-xs mx-auto space-y-3">
        {!captured && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-2xl border-2 border-gray-100 text-sm font-semibold text-[#0B2560] hover:border-[#0B2560]/30 transition"
          >
            Upload from gallery instead
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={() => onDone([])} className="text-sm text-gray-500 hover:text-[#0B2560] font-medium">
            Skip this step
          </button>
          <button
            type="button"
            disabled={!captured}
            onClick={() => captured && onDone([captured])}
            className="px-6 py-3 bg-[#0B2560] text-white font-bold text-sm rounded-xl shadow-md shadow-[#0B2560]/20 hover:bg-[#0d2d72] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
