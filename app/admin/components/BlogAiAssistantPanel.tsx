'use client';

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Check } from 'lucide-react';
import { newBlock, type ContentBlock, type ContentBlockType } from '@/app/lib/contentBlocks/types';

interface Action {
  type: ContentBlockType;
  label: string;
  endpoint: string;
  // Some routes return a shape that needs remapping onto the target block's
  // data shape (e.g. generate-timeline's {label,description,duration} steps
  // are reused as-is for "timeline" but remapped to {phase,description,icon}
  // for "recovery" — see app/lib/contentBlocks/types.ts's block registry).
  mapResponse?: (data: any) => Record<string, any>;
}

const ACTIONS: Action[] = [
  { type: 'key-takeaways', label: 'Generate Key Takeaways', endpoint: '/api/admin/content-blocks/generate-summary' },
  { type: 'faq', label: 'Generate FAQ', endpoint: '/api/admin/content-blocks/generate-faq' },
  { type: 'benefits', label: 'Generate Benefits', endpoint: '/api/admin/content-blocks/generate-benefits' },
  { type: 'checklist', label: 'Generate Checklist', endpoint: '/api/admin/content-blocks/generate-checklist' },
  { type: 'timeline', label: 'Generate Timeline', endpoint: '/api/admin/content-blocks/generate-timeline' },
  {
    type: 'recovery',
    label: 'Generate Recovery Stages',
    endpoint: '/api/admin/content-blocks/generate-timeline',
    mapResponse: (data) => ({
      stages: (data.steps || []).map((s: any) => ({ phase: s.label, description: s.description || '', icon: '' })),
    }),
  },
  { type: 'procedure', label: 'Generate Procedure Steps', endpoint: '/api/admin/content-blocks/generate-procedure' },
  { type: 'comparison-table', label: 'Generate Comparison Table', endpoint: '/api/admin/content-blocks/generate-comparison' },
];

export default function BlogAiAssistantPanel({
  topic,
  context,
  onInsertBlock,
}: {
  topic: string;
  context: string;
  onInsertBlock: (block: ContentBlock) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inserted, setInserted] = useState<string | null>(null);

  const run = async (action: Action) => {
    if (!topic?.trim() && !context?.trim()) {
      setError('Add a title first — the AI needs a topic to generate from.');
      return;
    }
    setPending(action.type + action.label);
    setError(null);
    try {
      const res = await fetch(action.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, context, sourceSystem: 'content-block-blog' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Generation failed');

      const block = newBlock(action.type);
      block.data = action.mapResponse ? action.mapResponse(json.data) : json.data;
      onInsertBlock(block);

      setInserted(action.label);
      setTimeout(() => setInserted(null), 2500);
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-[#fafbff] overflow-hidden text-sm">
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-violet-500" />
          <span className="font-bold text-gray-700 text-xs">AI Assistant</span>
          <span className="text-[10px] text-gray-400 font-medium">Generates a new block from your article&apos;s content</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACTIONS.map((action) => {
            const key = action.type + action.label;
            const loading = pending === key;
            return (
              <button
                key={key}
                type="button"
                disabled={pending !== null}
                onClick={() => run(action)}
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg font-semibold text-xs hover:border-violet-300 hover:text-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={12} className="animate-spin shrink-0" /> : <Sparkles size={12} className="text-violet-400 shrink-0" />}
                <span className="truncate">{action.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-red-600 text-xs">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}
        {inserted && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-green-700 text-xs">
            <Check size={13} className="shrink-0" /> {inserted} added — scroll down to review and edit it.
          </div>
        )}
      </div>
    </div>
  );
}
