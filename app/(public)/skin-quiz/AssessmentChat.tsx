"use client";

import { useEffect, useRef, useState } from "react";
import type { TreatmentRecommendation } from "@/app/lib/quizDefaults";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTED_PROMPTS = ["Compare my top treatments", "What's the cost?", "What's the recovery like?", "Any side effects?"];

// Collapsed by default on the results screen — opens into a short follow-up
// chat that already knows the visitor's concern and matched treatments, so
// it never re-asks what the structured assessment just collected.
export default function AssessmentChat({
  primaryConcern,
  recommendations,
  doctorMessage,
}: {
  primaryConcern: string;
  recommendations: TreatmentRecommendation[];
  doctorMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setError("");
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/assessment-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context: { primaryConcern, recommendations, doctorMessage } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Something went wrong");
      setMessages((m) => [...m, { role: "assistant", content: data.data.reply }]);
    } catch (err: any) {
      setError(err.message || "Something went wrong — please try again, or book a consultation.");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-[#0B2560]/15 bg-white text-[#0B2560] font-bold text-sm hover:border-[#0B2560]/30 hover:bg-[#f6faff] transition"
      >
        💬 Need more help? Chat with AI about your results
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#0B2560]/10 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-[#f6faff] border-b border-[#0B2560]/10">
        <p className="text-sm font-bold text-[#0B2560]">💬 Ask about your results</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      <div className="max-h-80 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400">
            Ask anything about your {primaryConcern ? `${primaryConcern} ` : ""}treatment plan — cost, recovery, sessions, or how it compares to alternatives.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-[#0B2560] text-white" : "bg-gray-50 text-gray-700"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-50 text-gray-400 rounded-2xl px-4 py-2.5 text-sm">Typing…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {SUGGESTED_PROMPTS.map((p) => (
            <button key={p} onClick={() => send(p)} className="text-xs font-semibold text-[#0B2560] bg-[#0B2560]/5 hover:bg-[#0B2560]/10 rounded-full px-3 py-1.5 transition">
              {p}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500 px-5 pb-2">{error}</p>}

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 300))}
          placeholder="Ask a question…"
          disabled={sending}
          className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#0B2560]/40"
        />
        <button type="submit" disabled={sending || !input.trim()} className="text-sm font-bold text-white bg-[#0B2560] rounded-xl px-4 py-2 disabled:opacity-40">
          Send
        </button>
      </form>
      <p className="text-[10px] text-gray-300 px-5 pb-3">AI-generated guidance — not a diagnosis. Your doctor will confirm your exact plan at consultation.</p>
    </div>
  );
}
