'use client';

import { useEffect, useMemo, useState } from 'react';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';
import { FaGoogle, FaPlay } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import {
  Eye, EyeOff, Star, Home, Trash2, RefreshCw, Plus, X, Loader,
  Edit2, CheckCircle, AlertTriangle, Sparkles, MessageSquare, Flag, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';

// ── Review Management (local-only — see the investigation report this
// followed: Google's API has no delete/report/status-check endpoint for a
// customer's review, so none of this ever calls Google. It's this app's
// own tracking of an admin-run, manual workflow.) ─────────────────────────

const REPORT_REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  fake_engagement: 'Fake engagement',
  off_topic: 'Off-topic',
  inappropriate_content: 'Inappropriate content',
  harassment_or_bullying: 'Harassment / bullying',
  conflict_of_interest: 'Conflict of interest',
  illegal_content: 'Illegal content',
  other: 'Other',
};
const REPORT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  not_reported: { label: 'Not reported', className: 'bg-gray-100 text-gray-500' },
  reported: { label: 'Reported', className: 'bg-amber-100 text-amber-700' },
  under_review: { label: 'Under review', className: 'bg-blue-100 text-blue-700' },
  removed: { label: 'Removed by Google', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected by Google', className: 'bg-red-100 text-red-700' },
};
// Google gives no per-review deep link (the Places API this sync uses
// exposes no permalink — see app/lib/reviews/googleReviewSync.ts's own
// comment) — this is the closest genuinely correct thing to link to: the
// Business Profile's own Reviews dashboard, where an admin manually finds
// the review (by author/date/text) and reports it themselves. Never a
// fabricated per-review URL.
const GOOGLE_BUSINESS_REVIEWS_URL = 'https://business.google.com/reviews';

// ── Source badge config ───────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  google: { label: 'Google', bg: '#EA4335', color: '#fff' },
  manual: { label: 'Manual', bg: '#0B2560', color: '#fff' },
  video:  { label: 'Video',  bg: '#F5A623', color: '#fff' },
};
const getSrc = (s: string) => SOURCE_CONFIG[s] ?? { label: s, bg: '#6B7280', color: '#fff' };

const CITIES = ['', 'chennai', 'bangalore', 'coimbatore', 'kochi'];
const CITY_LABELS: Record<string, string> = {
  '': 'All Cities', chennai: 'Chennai', bangalore: 'Bangalore',
  coimbatore: 'Coimbatore', kochi: 'Kochi',
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) =>
        n <= rating
          ? <AiFillStar key={n} className="text-[#F5A623]" size={13} />
          : <AiOutlineStar key={n} className="text-gray-300" size={13} />
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tab, onAdd }: { tab: string; onAdd: () => void }) {
  return (
    <div className="text-center py-20 col-span-full">
      <p className="text-5xl mb-4">💬</p>
      <p className="text-gray-500 font-semibold mb-1">No {tab === 'all' ? '' : tab} reviews yet</p>
      <p className="text-gray-400 text-sm mb-6">
        {tab === 'google'
          ? 'Click "Sync Google" to import reviews from your Google Business profile.'
          : 'Add your first review to display on the homepage.'}
      </p>
      {tab !== 'google' && (
        <button onClick={onAdd} className="bg-[#0B2560] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition">
          + Add Review
        </button>
      )}
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewCard({
  review,
  onToggle,
  onDelete,
  onEdit,
  onManageUpdate,
  onAnalyze,
}: {
  review: any;
  onToggle: (id: string, field: 'isVisible' | 'isFeatured' | 'showOnHomepage', val: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (review: any) => void;
  onManageUpdate: (id: string, patch: Record<string, any>) => Promise<void>;
  onAnalyze: (id: string) => Promise<void>;
}) {
  const src = getSrc(review.source);
  const initials = review.authorName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const needsAttention = typeof review.rating === 'number' && review.rating <= 2;

  const [manageOpen, setManageOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState(review.replyText || '');
  const [savingReply, setSavingReply] = useState(false);
  const [reportReasonDraft, setReportReasonDraft] = useState(review.reportReason || '');
  const [savingReport, setSavingReport] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 shadow-sm transition ${
      !review.isVisible ? 'opacity-60 border-dashed border-gray-300' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: src.bg, color: src.color }}
          >
            {review.source === 'google' && <FaGoogle size={8} />}
            {review.source === 'video' && <FaPlay size={8} />}
            {review.source === 'manual' && <MdVerified size={9} />}
            {src.label}
          </span>
          {review.rating && <Stars rating={review.rating} />}
          {needsAttention && (
            <span
              title="1–2 star review — a low rating alone is never a reason to report/remove it; review the content yourself"
              className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-red-50 text-red-600"
            >
              <AlertTriangle size={9} /> Needs Attention
            </span>
          )}
          {review.reported && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${REPORT_STATUS_LABELS[review.reportStatus as string]?.className || 'bg-gray-100 text-gray-500'}`}>
              <Flag size={9} /> {REPORT_STATUS_LABELS[review.reportStatus as string]?.label || 'Reported'}
            </span>
          )}
          {review.location && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
              {review.location}
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(review._id)}
          className="text-gray-300 hover:text-red-500 transition shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Author */}
      <div className="flex items-center gap-2.5">
        {review.authorAvatar ? (
          <img src={review.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#0B2560] flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">{initials}</span>
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-[#0B2560]">{review.authorName}</p>
          {review.services?.length > 0 && (
            <p className="text-[10px] text-[#3B82C4]">{review.services.slice(0, 2).join(', ')}</p>
          )}
        </div>
      </div>

      {/* Video thumbnail */}
      {review.source === 'video' && review.videoUrl && (
        <a href={review.videoUrl} target="_blank" rel="noopener noreferrer"
          className="relative rounded-lg overflow-hidden h-28 bg-gray-900 flex items-center justify-center group">
          {review.videoThumbnail && (
            <img src={review.videoThumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition" />
          <div className="relative w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
            <FaPlay className="text-[#0B2560] ml-0.5" size={12} />
          </div>
        </a>
      )}

      {/* Review text */}
      {review.reviewText && (
        <p className="text-gray-600 text-xs leading-relaxed line-clamp-3 italic">
          &ldquo;{review.reviewText}&rdquo;
        </p>
      )}

      {/* Toggle controls */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50 flex-wrap">
        <ToggleBtn
          active={review.isVisible}
          onClick={() => onToggle(review._id, 'isVisible', !review.isVisible)}
          activeIcon={<Eye size={11} />}
          inactiveIcon={<EyeOff size={11} />}
          activeLabel="Visible"
          inactiveLabel="Hidden"
          activeClass="bg-green-100 text-green-700"
          inactiveClass="bg-gray-100 text-gray-500"
        />
        <ToggleBtn
          active={review.isFeatured}
          onClick={() => onToggle(review._id, 'isFeatured', !review.isFeatured)}
          activeIcon={<Star size={11} />}
          inactiveIcon={<Star size={11} />}
          activeLabel="Featured"
          inactiveLabel="Feature"
          activeClass="bg-[#F5A623]/15 text-[#b87a00]"
          inactiveClass="bg-gray-100 text-gray-500"
        />
        <ToggleBtn
          active={review.showOnHomepage}
          onClick={() => onToggle(review._id, 'showOnHomepage', !review.showOnHomepage)}
          activeIcon={<Home size={11} />}
          inactiveIcon={<Home size={11} />}
          activeLabel="Homepage"
          inactiveLabel="Homepage"
          activeClass="bg-[#0B2560]/10 text-[#0B2560]"
          inactiveClass="bg-gray-100 text-gray-500"
        />
        <button
          onClick={() => onEdit(review)}
          className="ml-auto flex items-center gap-1 text-[10px] text-[#3B82C4] hover:text-[#0B2560] font-semibold transition"
        >
          <Edit2 size={10} /> {review.source === 'google' ? 'Classify' : 'Edit'}
        </button>
      </div>

      {/* Sync date + Maps link for Google reviews */}
      {review.source === 'google' && (
        <div className="flex items-center gap-2 -mt-1">
          {review.syncedAt && (
            <p className="text-[9px] text-gray-300">
              Synced {new Date(review.syncedAt).toLocaleDateString('en-IN')}
            </p>
          )}
          {review.meta?.googleMapsUrl && (
            <a href={review.meta.googleMapsUrl} target="_blank" rel="noopener noreferrer"
              className="text-[9px] text-[#3B82C4] hover:underline">
              View on Google ↗
            </a>
          )}
        </div>
      )}

      {/* Manage — reply drafting + report tracking + AI assist. Purely
          local to this app; see the header note on GOOGLE_BUSINESS_REVIEWS_URL
          for why there's no per-review "report" button that actually calls
          Google (no such API exists). */}
      <button
        onClick={() => setManageOpen((v) => !v)}
        className="flex items-center justify-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-[#0B2560] pt-1 border-t border-gray-50"
      >
        {manageOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Manage
      </button>

      {manageOpen && (
        <div className="space-y-3 pt-1">
          {/* AI Assist */}
          <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1">
                <Sparkles size={10} /> AI Assist
              </p>
              <button
                onClick={async () => { setAnalyzing(true); await onAnalyze(review._id); setAnalyzing(false); }}
                disabled={analyzing || !review.reviewText}
                className="text-[10px] font-semibold text-violet-700 hover:underline disabled:opacity-40"
              >
                {analyzing ? 'Analyzing…' : review.aiAnalysis ? 'Re-analyze' : 'Analyze'}
              </button>
            </div>
            {!review.reviewText && <p className="text-[10px] text-violet-400">No review text to analyze.</p>}
            {review.aiAnalysis?.analyzedAt ? (
              <div className="text-[11px] text-violet-900 space-y-1">
                <p>Sentiment: <span className="font-semibold capitalize">{review.aiAnalysis.sentiment || '—'}</span> · Severity: <span className="font-semibold capitalize">{review.aiAnalysis.severity || '—'}</span></p>
                <p>
                  Possible policy violation: <span className="font-semibold">{review.aiAnalysis.possiblePolicyViolation ? `Yes — ${REPORT_REASON_LABELS[review.aiAnalysis.possibleReason] || review.aiAnalysis.possibleReason}` : 'No'}</span>
                  {review.aiAnalysis.confidence != null && <span className="text-violet-500"> ({Math.round(review.aiAnalysis.confidence * 100)}% confidence)</span>}
                </p>
                {review.aiAnalysis.rawExplanation && <p className="text-violet-600 italic">&ldquo;{review.aiAnalysis.rawExplanation}&rdquo;</p>}
                <p className="text-[9px] text-violet-400 pt-0.5">
                  This is a suggestion for you to consider — a low rating alone is never grounds for reporting/removing a review. You decide.
                </p>
              </div>
            ) : (
              !analyzing && review.reviewText && <p className="text-[10px] text-violet-400">Not analyzed yet.</p>
            )}
          </div>

          {/* Reply draft */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <MessageSquare size={10} /> Reply {review.source === 'google' && '(draft here, post it yourself on Google)'}
            </p>
            <textarea
              rows={2}
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="Draft a reply…"
              className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs resize-none bg-white"
            />
            <div className="flex items-center justify-between mt-1.5">
              <select
                value={review.replyStatus || 'none'}
                onChange={(e) => onManageUpdate(review._id, { replyStatus: e.target.value })}
                className="border border-blue-200 rounded-lg px-2 py-1 text-[10px] bg-white"
              >
                <option value="none">Not replied</option>
                <option value="draft">Draft saved</option>
                <option value="sent">Sent on Google</option>
              </select>
              <button
                onClick={async () => {
                  setSavingReply(true);
                  await onManageUpdate(review._id, { replyText: replyDraft, replyStatus: review.replyStatus === 'none' ? 'draft' : review.replyStatus });
                  setSavingReply(false);
                }}
                disabled={savingReply}
                className="text-[10px] font-semibold text-blue-700 hover:underline disabled:opacity-40"
              >
                {savingReply ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </div>

          {/* Report tracking */}
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Flag size={10} /> Report to Google
            </p>
            <p className="text-[9px] text-amber-600 mb-1.5">
              Google has no API to report/remove a review — this only tracks your own manual report, filed on Google&rsquo;s own site.
            </p>
            <div className="flex items-center gap-1.5 mb-1.5">
              <select
                value={reportReasonDraft}
                onChange={(e) => setReportReasonDraft(e.target.value)}
                className="flex-1 border border-amber-200 rounded-lg px-2 py-1 text-[10px] bg-white"
              >
                <option value="">Reason (only if a real violation)…</option>
                {Object.entries(REPORT_REASON_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <a href={GOOGLE_BUSINESS_REVIEWS_URL} target="_blank" rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-amber-700 hover:underline">
                Open Google <ExternalLink size={9} />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <select
                value={review.reportStatus || 'not_reported'}
                onChange={(e) => onManageUpdate(review._id, { reportStatus: e.target.value, reported: e.target.value !== 'not_reported' })}
                className="border border-amber-200 rounded-lg px-2 py-1 text-[10px] bg-white"
              >
                {Object.entries(REPORT_STATUS_LABELS).map(([k, meta]) => <option key={k} value={k}>{meta.label}</option>)}
              </select>
              <button
                onClick={async () => {
                  setSavingReport(true);
                  await onManageUpdate(review._id, { reportReason: reportReasonDraft, reported: true, reportStatus: review.reportStatus === 'not_reported' ? 'reported' : review.reportStatus });
                  setSavingReport(false);
                }}
                disabled={savingReport || !reportReasonDraft}
                className="text-[10px] font-semibold text-amber-700 hover:underline disabled:opacity-40"
              >
                {savingReport ? 'Saving…' : 'Mark as Reported'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleBtn({
  active, onClick, activeIcon, inactiveIcon, activeLabel, inactiveLabel, activeClass, inactiveClass,
}: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition ${
        active ? activeClass : inactiveClass
      }`}
    >
      {active ? activeIcon : inactiveIcon}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  source: 'manual', authorName: '', authorAvatar: '', rating: 5,
  reviewText: '', videoUrl: '', videoThumbnail: '', location: '',
  services: '', isFeatured: false, showOnHomepage: true, isVisible: true,
  reviewDate: new Date().toISOString().split('T')[0],
};

function ReviewModal({
  initial,
  onClose,
  onSave,
}: {
  initial: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  // Google's own content/identity is read-only here — same rule the
  // backend enforces in app/lib/reviews/googleReviewSync.ts
  // (stripGoogleProtectedFields), so a disabled field here can never
  // silently "fail" to save; the server would ignore it anyway even if
  // this check were removed. Location/Services/presentation stay editable.
  const isGoogle = form.source === 'google';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        services: form.services
          ? form.services.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        rating: Number(form.rating),
      });
      // onSave (saveReview) only resolves on genuine success — it closes
      // this modal itself, so there's nothing left to do here.
    } catch (err: any) {
      // Previously onSave never rejected even when the API call failed
      // (wrong permissions, validation error, etc.) — the modal closed as
      // if it saved and the doctor had no idea the review was never
      // actually created. Surface it instead of silently discarding it.
      setError(err.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-[#0B2560]">
            {isGoogle ? 'Classify Google Review' : initial._id ? 'Edit Review' : 'Add Review'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isGoogle && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-[11px] text-blue-800 leading-relaxed">
              This review came from Google — the reviewer's name, photo, rating, review text, and date are read-only
              and update automatically on the next sync. You can still classify it (Location/Services) and control how
              it's presented on the site below.
              {form.syncedAt && (
                <p className="mt-1 text-blue-600">Last synced: {new Date(form.syncedAt).toLocaleString('en-IN')}</p>
              )}
              {form.meta?.googleMapsUrl && (
                <a href={form.meta.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline">
                  View reviewer on Google Maps ↗
                </a>
              )}
            </div>
          )}

          {/* Source */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Source</label>
            {isGoogle ? (
              <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 flex items-center gap-1.5">
                <FaGoogle size={11} /> Google (read-only)
              </div>
            ) : (
              <select value={form.source} onChange={(e) => set('source', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="manual">Manual (Verified Patient)</option>
                <option value="video">Video Review</option>
              </select>
            )}
          </div>

          {/* Author Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{isGoogle ? 'Reviewer' : 'Patient Name *'}</label>
            <input required={!isGoogle} disabled={isGoogle} value={form.authorName} onChange={(e) => set('authorName', e.target.value)}
              placeholder="e.g. Priya S."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500" />
          </div>

          {/* Avatar URL (optional) */}
          {!isGoogle && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Avatar URL (optional)</label>
              <input value={form.authorAvatar} onChange={(e) => set('authorAvatar', e.target.value)}
                placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" disabled={isGoogle} onClick={() => set('rating', n)}
                  className="disabled:cursor-not-allowed">
                  {n <= form.rating
                    ? <AiFillStar className={isGoogle ? 'text-[#F5A623]/50' : 'text-[#F5A623]'} size={22} />
                    : <AiOutlineStar className="text-gray-300" size={22} />}
                </button>
              ))}
            </div>
          </div>

          {/* Review text */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Review Text</label>
            <textarea rows={3} disabled={isGoogle} value={form.reviewText} onChange={(e) => set('reviewText', e.target.value)}
              placeholder="What the patient said..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none disabled:bg-gray-50 disabled:text-gray-500" />
          </div>

          {/* Video URL (only for video source) */}
          {form.source === 'video' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Video URL (YouTube/Vimeo)</label>
                <input value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Thumbnail URL (optional)</label>
                <input value={form.videoThumbnail} onChange={(e) => set('videoThumbnail', e.target.value)}
                  placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
            <select value={form.location} onChange={(e) => set('location', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {CITIES.map((c) => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
            </select>
          </div>

          {/* Services */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Services (comma-separated)
            </label>
            <input value={form.services} onChange={(e) => set('services', e.target.value)}
              placeholder="Hair Restoration, PRP Therapy" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{isGoogle ? 'Published Date' : 'Review Date'}</label>
            <input type="date" disabled={isGoogle} value={form.reviewDate?.slice ? form.reviewDate.slice(0, 10) : form.reviewDate} onChange={(e) => set('reviewDate', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500" />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { key: 'isFeatured', label: 'Featured' },
              { key: 'showOnHomepage', label: 'Show on Homepage' },
              { key: 'isVisible', label: 'Visible' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => set(key, !form[key])}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    form[key] ? 'bg-[#0B2560]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    form[key] ? 'translate-x-5' : ''
                  }`} />
                </button>
                <span className="text-xs text-gray-600 font-medium">{label}</span>
              </label>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#0B2560] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0d2d73] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : <><CheckCircle size={14} /> Save Review</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'manual' | 'google' | 'video'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [homepageOnly, setHomepageOnly] = useState(false);
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncIsError, setSyncIsError] = useState(false);
  const [lastSync, setLastSync] = useState<{ lastSyncAt: string | null; lastSyncStatus: string | null } | null>(null);
  const [modal, setModal] = useState<any | null>(null); // null = closed, {} = new, {...} = edit

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/admin/reviews/sync-status');
      const d = await res.json();
      if (d.success) setLastSync(d.state);
    } catch {}
  };

  // Fetch the full (bounded — API already caps at 200) review list once.
  // Five independent filters (tab/location/rating/featured/homepage) used
  // to each trigger their own fresh server round trip; all five are simple
  // equality/boolean checks, straightforward to filter client-side instead.
  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews');
      const d = await res.json();
      if (d.success) setReviews(d.reviews);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); fetchSyncStatus(); }, []);

  // Scoped by locationFilter only, same semantic the API previously
  // enforced server-side ("counts must reflect the location filter only,
  // otherwise selecting a source tab makes every OTHER tab's count read
  // wrong") — computed here from the full fetched list instead.
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reviews) {
      if (locationFilter && r.location !== locationFilter) continue;
      const key = r.source || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [reviews, locationFilter]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (tab !== 'all' && r.source !== tab) return false;
      if (locationFilter && r.location !== locationFilter) return false;
      if (ratingFilter && r.rating !== Number(ratingFilter)) return false;
      if (featuredOnly && !r.isFeatured) return false;
      if (homepageOnly && !r.showOnHomepage) return false;
      // A rating <=2 alone, NOT a policy-violation claim — see the
      // "Needs Attention" badge on ReviewCard for the same wording.
      if (needsAttentionOnly && !(typeof r.rating === 'number' && r.rating <= 2)) return false;
      return true;
    });
  }, [reviews, tab, locationFilter, ratingFilter, featuredOnly, homepageOnly, needsAttentionOnly]);

  const toggle = async (id: string, field: 'isVisible' | 'isFeatured' | 'showOnHomepage', val: boolean) => {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: val }),
    });
    const data = await res.json();
    if (data.success) setReviews((prev) => prev.map((r) => r._id === id ? { ...r, [field]: val } : r));
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) setReviews((prev) => prev.filter((r) => r._id !== id));
  };

  // Generic patch for the Manage panel's reply/report fields — same PATCH
  // route/allowlist toggle() above already uses, just a wider field set.
  const manageUpdate = async (id: string, patch: Record<string, any>) => {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (data.success) setReviews((prev) => prev.map((r) => r._id === id ? { ...r, ...patch } : r));
  };

  // AI Assist — admin-triggered only, never automatic; writes only
  // aiAnalysis, never reported/reportStatus (see app/lib/reviews/
  // analyzeReview.ts's own comment).
  const analyzeReview = async (id: string) => {
    const res = await fetch(`/api/admin/reviews/${id}/analyze`, { method: 'POST' });
    const data = await res.json();
    if (data.success) setReviews((prev) => prev.map((r) => r._id === id ? { ...r, aiAnalysis: data.aiAnalysis } : r));
  };

  const saveReview = async (data: any) => {
    // Previously this never checked res.ok/success — a failed save (wrong
    // permissions, a validation error, anything) still fell through to
    // setModal(null) below, so the dialog closed looking successful while
    // nothing was actually written. Only close on a genuine 2xx + success.
    const res = data._id
      ? await fetch(`/api/admin/reviews/${data._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      : await fetch('/api/admin/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.message || `Failed to save review (${res.status})`);
    }
    setModal(null);
    fetchReviews();
  };

  const syncGoogle = async () => {
    setSyncing(true);
    setSyncMsg('');
    setSyncIsError(false);
    try {
      const res = await fetch('/api/admin/reviews/sync-google', { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        const parts = [`Imported: ${d.imported ?? 0}`, `Updated: ${d.updated ?? 0}`, `Unchanged: ${d.unchanged ?? 0}`, `Failed: ${d.failed ?? 0}`];
        setSyncMsg(`✓ Google Sync Complete — ${parts.join(', ')}`);
        setSyncIsError(false);
        fetchReviews();
      } else {
        // Cooldown (429) reads the same as any other blocked attempt — the
        // message already says how long to wait.
        setSyncMsg(`⚠ ${d.message}`);
        setSyncIsError(true);
      }
    } catch {
      setSyncMsg('⚠ Sync failed. Check your connection.');
      setSyncIsError(true);
    }
    setSyncing(false);
    fetchSyncStatus();
  };

  // True global counts from the API's $group aggregation (scoped only by the
  // location filter) — not derived from the already-tab-filtered `reviews`
  // array, which previously made every non-active tab's count read wrong.
  const counts = {
    all: Object.values(sourceCounts).reduce((sum, n) => sum + n, 0),
    manual: sourceCounts.manual || 0,
    google: sourceCounts.google || 0,
    video: sourceCounts.video || 0,
  };

  const TABS: { key: typeof tab; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'manual', label: `Manual (${counts.manual})` },
    { key: 'google', label: `Google (${counts.google})` },
    { key: 'video', label: `Video (${counts.video})` },
  ];

  return (
    <div className="p-8 max-w-6xl">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2560]">Reviews</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage patient reviews from all sources. Homepage layout is configured in Homepage → Testimonials.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={syncGoogle}
              disabled={syncing}
              className="flex items-center gap-2 border border-[#EA4335] text-[#EA4335] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#EA4335]/5 transition disabled:opacity-60"
            >
              {syncing ? <Loader size={14} className="animate-spin" /> : <FaGoogle size={13} />}
              {syncing ? 'Syncing…' : 'Sync Google'}
            </button>
            <button
              onClick={() => setModal({})}
              className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition"
            >
              <Plus size={15} /> Add Review
            </button>
          </div>
          {lastSync?.lastSyncAt && (
            <p className="text-[10px] text-gray-400">
              Last Google Sync: {new Date(lastSync.lastSyncAt).toLocaleString('en-IN')}
              {lastSync.lastSyncStatus === 'error' && <span className="text-red-500 ml-1">(last attempt failed)</span>}
            </p>
          )}
        </div>
      </div>

      {/* Google's own limitation — always visible, not just after a sync,
          so nobody assumes a full historical import ever happened. */}
      <p className="text-[11px] text-gray-400 mb-4 flex items-start gap-1.5">
        <FaGoogle size={10} className="shrink-0 mt-0.5" />
        Google currently returns up to 5 most relevant reviews per Place Details request. Sync does not represent a
        complete historical Google review import.
      </p>

      {/* Sync status message */}
      {syncMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          syncIsError ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {syncMsg}
          {syncMsg.includes('GOOGLE_PLACES_API_KEY') && (
            <p className="mt-1 text-xs opacity-80">Add GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID to your .env.local file.</p>
          )}
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Source tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                tab === key ? 'bg-white text-[#0B2560] shadow-sm' : 'text-gray-500 hover:text-[#0B2560]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Location filter */}
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-[#0B2560]"
        >
          {CITIES.map((c) => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
        </select>

        {/* Rating filter */}
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-[#0B2560]"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Star{n !== 1 ? 's' : ''}</option>)}
        </select>

        {/* Flag toggles */}
        <button
          onClick={() => setFeaturedOnly((v) => !v)}
          className={`flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-xl transition ${
            featuredOnly ? 'bg-[#F5A623]/15 text-[#b87a00]' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Star size={13} /> Featured Only
        </button>
        <button
          onClick={() => setHomepageOnly((v) => !v)}
          className={`flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-xl transition ${
            homepageOnly ? 'bg-[#0B2560]/10 text-[#0B2560]' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Home size={13} /> Homepage Only
        </button>
        <button
          onClick={() => setNeedsAttentionOnly((v) => !v)}
          title="1–2 star reviews — a low rating alone, never a claim these violate any policy"
          className={`flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-xl transition ${
            needsAttentionOnly ? 'bg-red-50 text-red-600' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle size={13} /> Needs Attention
        </button>

        {(locationFilter || ratingFilter || featuredOnly || homepageOnly || needsAttentionOnly) && (
          <button
            onClick={() => { setLocationFilter(''); setRatingFilter(''); setFeaturedOnly(false); setHomepageOnly(false); setNeedsAttentionOnly(false); }}
            className="text-xs text-gray-400 hover:text-[#0B2560] font-semibold underline"
          >
            Clear filters
          </button>
        )}

        <button onClick={fetchReviews} className="text-gray-400 hover:text-[#0B2560] transition p-2">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* REVIEW GRID */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="flex gap-2"><div className="h-5 w-16 rounded-full bg-gray-200" /><div className="h-5 w-20 rounded-full bg-gray-100" /></div>
              <div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-gray-200" /><div className="space-y-1 flex-1"><div className="h-3 w-24 rounded bg-gray-200" /><div className="h-2.5 w-16 rounded bg-gray-100" /></div></div>
              <div className="space-y-1.5"><div className="h-2.5 w-full rounded bg-gray-100" /><div className="h-2.5 w-5/6 rounded bg-gray-100" /></div>
            </div>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="grid">
          <EmptyState tab={tab} onAdd={() => setModal({})} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReviews.map((r) => (
            <ReviewCard
              key={r._id}
              review={r}
              onToggle={toggle}
              onDelete={deleteReview}
              onEdit={(rev) => setModal({ ...rev, services: rev.services?.join(', ') || '' })}
              onManageUpdate={manageUpdate}
              onAnalyze={analyzeReview}
            />
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modal !== null && (
        <ReviewModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={saveReview}
        />
      )}
    </div>
  );
}
