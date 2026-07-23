'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageCircle, X, Send, Loader2, Sparkles, Stethoscope, Tag, Camera, Calendar, ChevronRight } from 'lucide-react';
import { markdownToHtml } from '@/app/lib/blogMarkdown';

type Card = { type: 'doctor' | 'service' | 'offer' | 'result' | 'location'; id?: string; title: string; subtitle?: string; href?: string };
type ChatMessage = { role: 'user' | 'assistant'; content: string; cards?: Card[]; streaming?: boolean };

export type AiConfig = {
  enabled: boolean;
  greeting: string;
  welcomeMessage: string;
  theme: 'luxury' | 'minimal' | 'vibrant';
  suggestedQuestions: string[];
  quickActions: { label: string; action: string }[];
  enableBooking: boolean;
  enableWhatsappHandoff: boolean;
};

function visibleQuickActions(config: AiConfig) {
  return config.enableBooking ? config.quickActions : config.quickActions.filter(a => a.action !== '/book');
}

const CARD_ICON: Record<Card['type'], any> = {
  doctor: Stethoscope, service: Sparkles, offer: Tag, result: Camera, location: MessageCircle,
};

const THEME_ACCENT: Record<AiConfig['theme'], string> = {
  luxury: 'from-[#0B2560] to-[#1a4a8a]',
  minimal: 'from-gray-800 to-gray-600',
  vibrant: 'from-[#F5A623] to-[#e0891a]',
};

function getSessionId() {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem('ai_chat_session_id');
  if (!id) {
    id = (window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    window.localStorage.setItem('ai_chat_session_id', id);
  }
  return id;
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

export default function AiChatWidget({ config, whatsapp }: { config: AiConfig | null; whatsapp?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);
  const sessionIdRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedHistory = useRef(false);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

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

  if (!config || !config.enabled) return null;
  const accent = THEME_ACCENT[config.theme] || THEME_ACCENT.luxury;
  const waHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : null;

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        className={`fixed z-50 bottom-24 right-5 lg:bottom-6 lg:right-6 w-14 h-14 rounded-full bg-gradient-to-br ${accent} text-white shadow-[0_8px_28px_rgba(11,37,96,0.35)] flex items-center justify-center hover:scale-105 transition-transform`}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-50 bottom-40 right-5 lg:bottom-24 lg:right-6 w-[92vw] max-w-sm h-[70vh] max-h-[600px] rounded-3xl border border-white/40 bg-white/85 backdrop-blur-2xl shadow-[0_20px_60px_rgba(11,37,96,0.25)] flex flex-col overflow-hidden">

          {/* Header */}
          <div className={`bg-gradient-to-br ${accent} text-white px-5 py-4 flex items-center gap-3 shrink-0`}>
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-snug truncate">{config.greeting}</p>
              <p className="text-white/60 text-[11px] leading-snug truncate">{config.welcomeMessage}</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {disabled && (
              <p className="text-xs text-gray-400 text-center py-6">The AI assistant is currently unavailable. Please call or WhatsApp us instead.</p>
            )}

            {messages.length === 0 && !disabled && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 px-1">Try asking:</p>
                {config.suggestedQuestions.map((q, i) => (
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
                </div>
              </div>
            ))}

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </div>

          {/* Quick actions */}
          {visibleQuickActions(config).length > 0 && (
            <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide shrink-0">
              {visibleQuickActions(config).map((a, i) => (
                <Link key={i} href={a.action}
                  className="shrink-0 text-[11px] font-semibold bg-gray-50 hover:bg-gray-100 text-[#0B2560] px-3 py-1.5 rounded-full border border-gray-100 transition whitespace-nowrap">
                  {a.label}
                </Link>
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
        </div>
      )}
    </>
  );
}
