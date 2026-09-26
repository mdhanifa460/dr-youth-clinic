"use client";

// AI Photo Coach (AI Beauty Journey, Module 3) — guided multi-angle live camera
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

type Step = { angle: string; label: string; tip: string; facing: "user" | "environment"; oval: boolean };

const HAIR_STEPS: Step[] = [
  { angle: "front-hairline", label: "Front hairline", tip: "Face the camera, hair pulled back so your hairline is clearly visible.", facing: "user", oval: true },
  { angle: "top-crown", label: "Top / crown", tip: "Tilt your head down and hold the camera above your crown. A helper or the back camera makes this easier.", facing: "environment", oval: false },
  { angle: "side-left", label: "Side view", tip: "Turn to your side so the temple and side hairline are visible.", facing: "environment", oval: false },
];
const SKIN_STEPS: Step[] = [
  { angle: "front", label: "Front face", tip: "Look straight at the camera in even, natural light, no filters.", facing: "user", oval: true },
  { angle: "side-left", label: "Left side", tip: "Turn your face to show your left cheek and jawline.", facing: "user", oval: true },
  { angle: "side-right", label: "Right side", tip: "Turn your face to show your right cheek and jawline.", facing: "user", oval: true },
];
const GENERIC_STEPS: Step[] = [
  { angle: "front", label: "Clear photo", tip: "Show the area you want help with in good, even light.", facing: "environment", oval: false },
];

function stepsFor(goalSlug: string, goalLabel: string): Step[] {
  const key = `${goalSlug} ${goalLabel}`.toLowerCase();
  if (key.includes("hair")) return HAIR_STEPS;
  if (key.includes("skin") || key.includes("acne") || key.includes("pigment") || key.includes("face")) return SKIN_STEPS;
  return GENERIC_STEPS;
}

// The camera is only requested from a user tap ("Open camera") — many mobile
// browsers (notably iOS Safari) silently refuse or never show the permission
// prompt for getUserMedia fired from a mount effect. play() is called
// explicitly for the same reason (autoPlay alone can leave a black frame).
function CameraCapture({
  step, onCaptured, onCameraUnavailable,
}: { step: Step; onCaptured: (blob: Blob) => void; onCameraUnavailable: (reason: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">(step.facing);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (!navigator.mediaDevices?.getUserMedia) { onCameraUnavailable("Camera isn't supported in this browser."); return; }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false })
      .then(async (stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        try { await v.play(); } catch { /* autoplay already set */ }
        setReady(true);
      })
      .catch((e: any) => onCameraUnavailable(
        e?.name === "NotAllowedError" ? "Camera permission was denied — allow it in your browser settings, or upload a photo instead."
          : e?.name === "NotFoundError" ? "No camera found on this device — upload a photo instead."
          : "Couldn't start the camera — upload a photo instead."
      ));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Front camera preview is mirrored by CSS; mirror the saved frame to match.
    if (facing === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) onCaptured(blob); }, "image/jpeg", 0.92);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] max-w-xs mx-auto">
      <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
      {step.oval && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[62%] aspect-[3/4] rounded-[50%] border-2 border-white/70 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
        </div>
      )}
      <p className="absolute top-3 inset-x-3 text-center text-white text-xs font-semibold bg-black/45 rounded-xl px-3 py-2">{step.tip}</p>
      {!ready && <p className="absolute inset-0 flex items-center justify-center text-white/80 text-xs">Starting camera…</p>}
      <button
        type="button"
        onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
        aria-label="Switch camera"
        className="absolute bottom-6 right-4 w-11 h-11 rounded-full bg-white/25 text-white text-lg backdrop-blur"
      >⟲</button>
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
  goalSlug = "",
  onDone,
}: {
  goalLabel: string;
  goalSlug?: string;
  onDone: (photos: CapturedPhoto[]) => void;
}) {
  const steps = stepsFor(goalSlug, goalLabel);
  const [idx, setIdx] = useState(0);
  const [taken, setTaken] = useState<Record<string, CapturedPhoto>>({});
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMsg, setCameraMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step = steps[idx];
  const current = taken[step.angle];
  const isLast = idx === steps.length - 1;
  const photos = steps.map((s) => taken[s.angle]).filter(Boolean);

  const handleUpload = async (fileOrBlob: File | Blob) => {
    setUploading(true);
    setError("");
    try {
      const { url, publicId } = await uploadPhoto(fileOrBlob);
      setTaken((t) => ({ ...t, [step.angle]: { url, publicId, angle: step.angle } }));
      setCameraOpen(false);
    } catch (err: any) {
      setError(err.message || "Upload failed — please try again or skip this step.");
    } finally {
      setUploading(false);
    }
  };

  const next = () => {
    setCameraOpen(false);
    setCameraMsg("");
    setError("");
    if (isLast) onDone(photos);
    else setIdx(idx + 1);
  };

  return (
    <div className="py-6 md:py-10">
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          {goalLabel} · Photo coach (optional)
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">
          {steps.length > 1 ? `Photo ${idx + 1} of ${steps.length}: ${step.label}` : "Add a photo for sharper AI observations"}
        </h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Completely optional. Used only to generate general observations — never a diagnosis, never shared without your consent.
        </p>
        {steps.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.angle} className={`h-1.5 w-8 rounded-full ${taken[s.angle] ? "bg-emerald-500" : i === idx ? "bg-[#0B2560]" : "bg-gray-200"}`} />
            ))}
          </div>
        )}
      </div>

      {current ? (
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt={step.label} className="w-48 h-64 rounded-3xl object-cover shadow-md" />
          <button
            type="button"
            onClick={() => setTaken((t) => { const c = { ...t }; delete c[step.angle]; return c; })}
            className="text-xs font-semibold text-red-500 hover:text-red-700"
          >
            Retake this photo
          </button>
        </div>
      ) : uploading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <span className="w-8 h-8 border-2 border-[#0B2560]/20 border-t-[#0B2560] rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Uploading…</p>
        </div>
      ) : cameraOpen ? (
        <CameraCapture
          key={step.angle}
          step={step}
          onCaptured={handleUpload}
          onCameraUnavailable={(msg) => { setCameraOpen(false); setCameraMsg(msg); }}
        />
      ) : (
        <div className="max-w-xs mx-auto bg-white rounded-3xl border-2 border-dashed border-gray-200 px-6 py-8 text-center">
          <p className="text-4xl mb-3">📷</p>
          <p className="text-sm text-gray-600 mb-4">{step.tip}</p>
          <button
            type="button"
            onClick={() => { setCameraMsg(""); setCameraOpen(true); }}
            className="w-full py-3 rounded-2xl bg-[#0B2560] text-white text-sm font-bold"
          >
            Open camera
          </button>
          {cameraMsg && <p className="text-xs text-amber-600 mt-3">{cameraMsg}</p>}
        </div>
      )}

      {error && <p className="text-xs text-red-500 text-center mt-3">{error}</p>}

      <div className="mt-6 max-w-xs mx-auto space-y-3">
        {!current && (
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
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => (photos.length || !isLast ? next() : onDone([]))}
            className="text-sm text-gray-500 hover:text-[#0B2560] font-medium"
          >
            {current ? "Skip" : isLast ? "Skip this step" : "Skip this angle"}
          </button>
          <button
            type="button"
            disabled={!current}
            onClick={next}
            className="px-6 py-3 bg-[#0B2560] text-white font-bold text-sm rounded-xl shadow-md shadow-[#0B2560]/20 hover:bg-[#0d2d72] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isLast ? "Continue →" : "Next angle →"}
          </button>
        </div>
      </div>
    </div>
  );
}
