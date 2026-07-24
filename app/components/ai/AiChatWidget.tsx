'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageCircle, X, Send, Loader2, Sparkles, Stethoscope, Tag, Camera, Calendar,
  ChevronRight, ArrowLeft, CheckCircle, IndianRupee, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { markdownToHtml } from '@/app/lib/blogMarkdown';

type Card = { type: 'doctor' | 'service' | 'offer' | 'result' | 'location'; id?: string; title: string; subtitle?: string; href?: string };
type ChatMessage = { role: 'user' | 'assistant'; content: string; cards?: Card[]; streaming?: boolean; createdAt?: string; feedback?: 'up' | 'down' | null };
type View = 'chat' | 'book' | 'offers' | 'assessment';

type GreetingRule = {
  id: string;
  enabled: boolean;
  type: 'time_of_day' | 'date_range' | 'returning_visitor' | 'new_visitor' | 'branch';
  startHour?: number;
  endHour?: number;
  startDate?: string;
  endDate?: string;
  campaignParam?: string;
  branch?: string;
  greeting: string;
  welcomeMessage?: string;
  priority: number;
};

export type AiConfig = {
  enabled: boolean;
  greeting: string;
  welcomeMessage: string;
  theme: 'luxury' | 'minimal' | 'vibrant';
  suggestedQuestions: string[];
  suggestedQuestionsByBranch?: Record<string, string[]>;
  quickActions: { label: string; action: string; branch?: string }[];
  enableBooking: boolean;
  enableWhatsappHandoff: boolean;
  greetingRules?: GreetingRule[];
};

// The only branch signal available without a real intent/geo layer — reuses
// the ?location=/?clinic= convention the skin-quiz's campaign attribution
// already reads, rather than inventing a new one.
function getUrlBranch(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return (params.get('location') || params.get('clinic') || '').toLowerCase();
}

function getUrlCampaign(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('campaign') || '';
}

// Highest-`priority` enabled rule whose condition matches wins; ties break
// by array order (first match found). `isReturning` is the ONE signal that
// must be read before getSessionId() creates a fresh id, since that call
// itself makes every subsequent read look like a returning visitor.
function resolveGreeting(rules: GreetingRule[] | undefined, isReturning: boolean): { greeting: string; welcomeMessage?: string } | null {
  if (!rules?.length) return null;
  const now = new Date();
  const hour = now.getHours();
  const today = now.toISOString().slice(0, 10);
  const branch = getUrlBranch();
  const campaign = getUrlCampaign();

  const matches = rules.filter(r => {
    if (!r.enabled) return false;
    switch (r.type) {
      case 'time_of_day':
        return r.startHour !== undefined && r.endHour !== undefined &&
          (r.startHour <= r.endHour ? hour >= r.startHour && hour < r.endHour : hour >= r.startHour || hour < r.endHour);
      case 'date_range':
        if (!r.startDate || !r.endDate || today < r.startDate || today > r.endDate) return false;
        return !r.campaignParam || r.campaignParam.toLowerCase() === campaign.toLowerCase();
      case 'returning_visitor':
        return isReturning;
      case 'new_visitor':
        return !isReturning;
      case 'branch':
        return !!r.branch && !!branch && r.branch.toLowerCase() === branch;
      default:
        return false;
    }
  });
  if (matches.length === 0) return null;

  const best = matches.reduce((a, b) => (b.priority > a.priority ? b : a));
  return { greeting: best.greeting, welcomeMessage: best.welcomeMessage };
}

// Quick actions pointing at these three paths render as an inline panel
// inside the widget instead of navigating away — better on mobile, and it
// means never losing the conversation just to book or browse offers. Any
// other admin-added quick action (a custom path) still navigates normally,
// since there's no way to know how to inline an arbitrary future page.
const INLINE_VIEWS: Record<string, View> = { '/book': 'book', '/offers': 'offers', '/skin-quiz': 'assessment' };

function visibleQuickActions(config: AiConfig) {
  const branch = getUrlBranch();
  const branchScoped = config.quickActions.filter(a => !a.branch || a.branch.toLowerCase() === branch);
  return config.enableBooking ? branchScoped : branchScoped.filter(a => a.action !== '/book');
}

function visibleSuggestedQuestions(config: AiConfig) {
  const branch = getUrlBranch();
  const override = branch ? config.suggestedQuestionsByBranch?.[branch] : undefined;
  return override?.length ? override : config.suggestedQuestions;
}

const CARD_ICON: Record<Card['type'], any> = {
  doctor: Stethoscope, service: Sparkles, offer: Tag, result: Camera, location: MessageCircle,
};

const THEME_ACCENT: Record<AiConfig['theme'], string> = {
  luxury: 'from-[#0B2560] to-[#1a4a8a]',
  minimal: 'from-gray-800 to-gray-600',
  vibrant: 'from-[#F5A623] to-[#e0891a]',
};

const CONCERNS = ['Acne & Scars', 'Hair Fall', 'Pigmentation', 'Anti-Aging', 'Unwanted Hair', 'Something else'];

function getSessionId(): { id: string; isReturning: boolean } {
  if (typeof window === 'undefined') return { id: '', isReturning: false };
  const existing = window.localStorage.getItem('ai_chat_session_id');
  if (existing) return { id: existing, isReturning: true };
  const id = (window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  window.localStorage.setItem('ai_chat_session_id', id);
  return { id, isReturning: false };
}

function CardChip({ card }: { card: Card }) {
  const Icon = CARD_ICON[card.type] || Sparkles;
  const content = (
    <div className="shrink-0 w-44 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-3">
      <div className="w-7 h-7 rounded-lg bg-[#f6faff] flex items-center justify-center mb-2">
        <Icon size={13} className="text-[#0B2560]" />
      </div>
      <p className="text-xs font-bold text-[#0B2560] leading-snug line-clamp-2">{card.title}</p>
      {card.subtitle && <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{card.subtitle}</p>}
      <span className="text-[10px] font-semibold text-[#3B82C4] flex items-center gap-0.5 mt-1.5">View <ChevronRight size={10} /></span>
    </div>
  );
  return card.href ? <Link href={card.href} target="_blank">{content}</Link> : content;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#0B2560]/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
      <button onClick={onBack} className="text-gray-400 hover:text-[#0B2560]"><ArrowLeft size={16} /></button>
      <p className="text-sm font-bold text-[#0B2560]">{title}</p>
    </div>
  );
}

// ── Inline Booking ──────────────────────────────────────────────────────
function BookingPanel({ onBack, accent }: { onBack: () => void; accent: string }) {
  const [form, setForm] = useState({ name: '', phone: '', service: '', date: '', time: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.date || !form.time) {
      setError('Name, phone, date, and time are required.'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/booking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'ai_chat' }),
      });
      const data = await res.json();
      if (data.success) setDone(true); else setError(data.message || 'Could not book — please try again.');
    } catch { setError('Network error — please try again.'); }
    finally { setSaving(false); }
  };

  if (done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
        <CheckCircle size={36} className="text-green-500" />
        <p className="font-bold text-[#0B2560] text-sm">Request received!</p>
        <p className="text-xs text-gray-400">Our team will call you shortly to confirm your slot.</p>
        <button onClick={onBack} className={`mt-2 bg-gradient-to-br ${accent} text-white text-xs font-bold px-5 py-2.5 rounded-xl`}>Back to Chat</button>
      </div>
    );
  }

  return (
    <>
      <PanelHeader title="Book a Consultation" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone number" type="tel"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        <input value={form.service} onChange={e => set('service', e.target.value)} placeholder="Concern / treatment (optional)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.date} onChange={e => set('date', e.target.value)} type="date"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          <input value={form.time} onChange={e => set('time', e.target.value)} type="time"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
      </div>
      <div className="p-4 border-t border-gray-100 shrink-0">
        <button onClick={submit} disabled={saving}
          className={`w-full bg-gradient-to-br ${accent} text-white text-sm font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2`}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />} Request Appointment
        </button>
      </div>
    </>
  );
}

// ── Inline Offers ────────────────────────────────────────────────────────
function OffersPanel({ onBack }: { onBack: () => void }) {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/offers').then(r => r.json()).then(d => { if (d.success) setOffers(d.data); }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PanelHeader title="Current Offers" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-8">Loading…</p>
        ) : offers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No active offers right now — check back soon!</p>
        ) : offers.map(o => (
          <div key={o._id} className="border border-gray-100 rounded-2xl p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-[#0B2560] leading-snug">{o.title}</p>
              {o.badge && <span className="shrink-0 text-[9px] font-bold bg-amber-50 text-[#F5A623] px-2 py-0.5 rounded-full">{o.badge}</span>}
            </div>
            {o.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{o.description}</p>}
            {o.discountedPrice && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-300 line-through flex items-center"><IndianRupee size={10} />{o.originalPrice}</span>
                <span className="text-sm font-extrabold text-[#0B2560] flex items-center"><IndianRupee size={12} />{o.discountedPrice}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Inline Assessment concern picker ─────────────────────────────────────
function AssessmentPanel({ onBack, onPickConcern, accent }: { onBack: () => void; onPickConcern: (c: string) => void; accent: string }) {
  return (
    <>
      <PanelHeader title="Quick Clinical Assessment" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs text-gray-400 mb-3">What's your main concern? I'll give you tailored guidance right here.</p>
        <div className="grid grid-cols-2 gap-2">
          {CONCERNS.map(c => (
            <button key={c} onClick={() => onPickConcern(c)}
              className="text-xs font-semibold bg-[#f6faff] hover:bg-blue-50 border border-blue-50 text-[#0B2560] px-3 py-3 rounded-xl transition text-left">
              {c}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-4 text-center">
          Want a full photo-based assessment with detailed scoring?{' '}
          <Link href="/skin-quiz" className={`font-bold bg-gradient-to-br ${accent} bg-clip-text text-transparent`}>Take the full quiz →</Link>
        </p>
      </div>
    </>
  );
}

export default function AiChatWidget({ config, whatsapp }: { config: AiConfig | null; whatsapp?: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);
  const sessionIdRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedHistory = useRef(false);
  const [resolvedGreeting, setResolvedGreeting] = useState<{ greeting: string; welcomeMessage?: string } | null>(null);

  useEffect(() => {
    const { id, isReturning } = getSessionId();
    sessionIdRef.current = id;
    setResolvedGreeting(resolveGreeting(config?.greetingRules, isReturning));
  }, [config]);

  useEffect(() => {
    if (!open || loadedHistory.current || !sessionIdRef.current) return;
    loadedHistory.current = true;
    fetch(`/api/ai-chat?sessionId=${encodeURIComponent(sessionIdRef.current)}`)
      .then(r => r.json())
      .then(d => { if (d.success && d.messages?.length) setMessages(d.messages); })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError('');
    setInput('');
    setView('chat');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }, { role: 'assistant', content: '', streaming: true }]);
    setStreaming(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current, message: trimmed }),
      });
      if (!res.body) throw new Error('No response stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: any;
          try { evt = JSON.parse(line); } catch { continue; }
          if (evt.type === 'delta') {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') last.content += evt.text;
              return next;
            });
          } else if (evt.type === 'cards') {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') last.cards = evt.cards;
              return next;
            });
          } else if (evt.type === 'meta') {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') last.createdAt = evt.createdAt;
              return next;
            });
          } else if (evt.type === 'disabled') {
            setDisabled(true);
          } else if (evt.type === 'error') {
            setError(evt.message || 'Something went wrong.');
          }
        }
      }
    } catch {
      setError('Connection lost — please try again.');
    } finally {
      setStreaming(false);
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') last.streaming = false;
        return next;
      });
    }
  }, [streaming]);

  const sendFeedback = useCallback((createdAt: string, feedback: 'up' | 'down') => {
    setMessages(prev => prev.map(m => (m.createdAt === createdAt ? { ...m, feedback } : m)));
    fetch('/api/ai-chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionIdRef.current, createdAt, feedback }),
    }).catch(() => {});
  }, []);

  if (!config || !config.enabled) return null;
  const accent = THEME_ACCENT[config.theme] || THEME_ACCENT.luxury;
  const waHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : null;

  const handleQuickAction = (action: string) => {
    const inline = INLINE_VIEWS[action];
    if (inline) setView(inline);
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(o => { if (o) setView('chat'); return !o; })}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        className={`fixed z-50 bottom-24 right-5 lg:bottom-6 lg:right-6 w-14 h-14 rounded-full bg-gradient-to-br ${accent} text-white shadow-[0_8px_28px_rgba(11,37,96,0.35)] flex items-center justify-center hover:scale-105 transition-transform`}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-50 bottom-40 right-5 lg:bottom-24 lg:right-6 w-[92vw] max-w-sm h-[70vh] max-h-[600px] rounded-3xl border border-white/40 bg-white/85 backdrop-blur-2xl shadow-[0_20px_60px_rgba(11,37,96,0.25)] flex flex-col overflow-hidden">

          {/* Header — hidden while in an inline sub-view, which has its own header */}
          {view === 'chat' && (
            <div className={`bg-gradient-to-br ${accent} text-white px-5 py-4 flex items-center gap-3 shrink-0`}>
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-snug truncate">{resolvedGreeting?.greeting || config.greeting}</p>
                <p className="text-white/60 text-[11px] leading-snug truncate">{resolvedGreeting?.welcomeMessage || config.welcomeMessage}</p>
              </div>
            </div>
          )}

          {view === 'book' && <BookingPanel onBack={() => setView('chat')} accent={accent} />}
          {view === 'offers' && <OffersPanel onBack={() => setView('chat')} />}
          {view === 'assessment' && (
            <AssessmentPanel
              onBack={() => setView('chat')}
              accent={accent}
              onPickConcern={(c) => send(`I'm concerned about ${c.toLowerCase()}. What treatments and next steps would you recommend?`)}
            />
          )}

          {view === 'chat' && (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {disabled && (
                  <p className="text-xs text-gray-400 text-center py-6">The AI assistant is currently unavailable. Please call or WhatsApp us instead.</p>
                )}

                {messages.length === 0 && !disabled && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 px-1">Try asking:</p>
                    {visibleSuggestedQuestions(config).map((q, i) => (
                      <button key={i} onClick={() => send(q)}
                        className="w-full text-left text-xs bg-[#f6faff] hover:bg-blue-50 border border-blue-50 text-[#0B2560] px-3.5 py-2.5 rounded-xl transition font-medium">
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={m.role === 'user' ? 'max-w-[85%]' : 'max-w-[92%] w-full'}>
                      {m.role === 'user' ? (
                        <div className={`bg-gradient-to-br ${accent} text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm`}>{m.content}</div>
                      ) : m.streaming && !m.content ? (
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm"><TypingDots /></div>
                      ) : (
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                          <div
                            className="text-sm text-gray-700 leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_strong]:text-[#0B2560] [&_ul]:pl-4 [&_ul]:list-disc [&_li]:mb-0.5"
                            dangerouslySetInnerHTML={{ __html: markdownToHtml(m.content) }}
                          />
                        </div>
                      )}
                      {m.cards && m.cards.length > 0 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                          {m.cards.map((c, ci) => <CardChip key={ci} card={c} />)}
                        </div>
                      )}
                      {m.role === 'assistant' && !m.streaming && m.createdAt && (
                        <div className="flex items-center gap-1.5 mt-1.5 px-1">
                          <button onClick={() => sendFeedback(m.createdAt!, 'up')}
                            className={`p-1 rounded-md transition ${m.feedback === 'up' ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-gray-500'}`}>
                            <ThumbsUp size={11} />
                          </button>
                          <button onClick={() => sendFeedback(m.createdAt!, 'down')}
                            className={`p-1 rounded-md transition ${m.feedback === 'down' ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-gray-500'}`}>
                            <ThumbsDown size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              </div>

              {/* Quick actions */}
              {visibleQuickActions(config).length > 0 && (
                <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide shrink-0">
                  {visibleQuickActions(config).map((a, i) => (
                    INLINE_VIEWS[a.action] ? (
                      <button key={i} onClick={() => handleQuickAction(a.action)}
                        className="shrink-0 text-[11px] font-semibold bg-gray-50 hover:bg-gray-100 text-[#0B2560] px-3 py-1.5 rounded-full border border-gray-100 transition whitespace-nowrap">
                        {a.label}
                      </button>
                    ) : (
                      <Link key={i} href={a.action}
                        className="shrink-0 text-[11px] font-semibold bg-gray-50 hover:bg-gray-100 text-[#0B2560] px-3 py-1.5 rounded-full border border-gray-100 transition whitespace-nowrap">
                        {a.label}
                      </Link>
                    )
                  ))}
                  {config.enableWhatsappHandoff && waHref && (
                    <a href={waHref} target="_blank" rel="noopener noreferrer"
                      onClick={() => {
                        fetch('/api/ai-chat/handoff', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ sessionId: sessionIdRef.current }),
                        }).catch(() => {});
                      }}
                      className="shrink-0 text-[11px] font-semibold bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-full border border-green-100 transition whitespace-nowrap">
                      💬 WhatsApp
                    </a>
                  )}
                </div>
              )}

              {/* Input */}
              <div className="border-t border-gray-100 p-3 flex items-center gap-2 shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder={disabled ? 'AI assistant unavailable' : 'Ask a question…'}
                  disabled={disabled}
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 disabled:bg-gray-50"
                />
                <button
                  onClick={() => send(input)}
                  disabled={streaming || disabled || !input.trim()}
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${accent} text-white flex items-center justify-center disabled:opacity-40 transition shrink-0`}
                >
                  {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
