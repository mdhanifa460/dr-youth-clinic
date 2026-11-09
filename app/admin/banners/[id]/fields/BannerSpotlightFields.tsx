"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  SPOTLIGHT_ICONS,
  SPOTLIGHT_MAX_CARDS,
  SPOTLIGHT_THEMES,
  SPOTLIGHT_THEME_DEFS,
  type SpotlightCard,
  type SpotlightData,
} from "@/app/lib/banners/spotlight";
import { Input, Textarea, Toggle } from "./shared";

const EMPTY: SpotlightData = {
  theme: "diwali",
  cards: [],
  closingLine: "",
  disclaimer: "",
  effects: { fireworks: false, sparkles: true, sound: false },
  soundLabel: "Tap for fireworks",
  doctorReviewed: false,
  reviewedBy: "",
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-semibold text-gray-500 mb-1 block">{children}</label>
);

// Content tab for a "Festival / Campaign Spotlight" banner: greeting, theme, cards,
// effects and the doctor-check confirmation. Uses the banner's own headline/subtitle/
// description for the greeting so nothing new is needed for the heading text.
export default function BannerSpotlightFields({ banner, set }: { banner: any; set: (patch: Record<string, any>) => void }) {
  const sp: SpotlightData = { ...EMPTY, ...(banner.spotlight || {}), effects: { ...EMPTY.effects, ...(banner.spotlight?.effects || {}) } };
  const update = (patch: Partial<SpotlightData>) => {
    // Any change to the cards means the doctor has to look again.
    const resetReview = "cards" in patch ? { doctorReviewed: false } : {};
    set({ spotlight: { ...sp, ...patch, ...resetReview } });
  };
  const setCard = (i: number, patch: Partial<SpotlightCard>) =>
    update({ cards: sp.cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...sp.cards];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update({ cards: next });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Greeting</p>
        <div>
          <Label>Admin Title (internal only)</Label>
          <Input value={banner.title} onChange={(v) => set({ title: v })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Theme</Label>
            <select
              value={sp.theme}
              onChange={(e) => update({ theme: e.target.value as SpotlightData["theme"] })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
            >
              {SPOTLIGHT_THEMES.map((t) => (
                <option key={t} value={t}>{SPOTLIGHT_THEME_DEFS[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Small line above the heading (optional)</Label>
            <Input value={banner.subtitle} onChange={(v) => set({ subtitle: v })} placeholder="e.g. Festival of lights" />
          </div>
        </div>
        <div>
          <Label>Heading</Label>
          <Textarea value={banner.headline} onChange={(v) => set({ headline: v })} rows={2} placeholder="e.g. Happy Pongal (press Enter for a second line)" />
        </div>
        <div>
          <Label>Message under the heading (optional)</Label>
          <Textarea value={banner.description} onChange={(v) => set({ description: v })} rows={2} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-gray-700">Cards ({sp.cards.length} of {SPOTLIGHT_MAX_CARDS})</p>
          <button
            type="button"
            disabled={sp.cards.length >= SPOTLIGHT_MAX_CARDS}
            onClick={() => update({ cards: [...sp.cards, { label: "", icon: "sparkles", title: "", body: "" }] })}
            className="flex items-center gap-1 text-sm font-semibold text-[#0B2560] disabled:opacity-40"
          >
            <Plus size={14} /> Add card
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Festival tips or offer highlights. Leave empty for a greeting only. Cards swipe sideways on phones.
          Only write what the clinic can stand behind: no invented results, prices or claims.
        </p>
        {sp.cards.map((card, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">Card {i + 1}</span>
              <div className="flex items-center gap-1 text-gray-400">
                <button type="button" aria-label="Move card up" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 hover:text-gray-700 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" aria-label="Move card down" onClick={() => move(i, 1)} disabled={i === sp.cards.length - 1} className="p-1 hover:text-gray-700 disabled:opacity-30"><ArrowDown size={14} /></button>
                <button type="button" aria-label="Remove card" onClick={() => update({ cards: sp.cards.filter((_, j) => j !== i) })} className="p-1 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <Label>Small label</Label>
                <Input value={card.label} onChange={(v) => setCard(i, { label: v })} placeholder="e.g. Sun care" />
              </div>
              <div>
                <Label>Icon</Label>
                <select value={card.icon} onChange={(e) => setCard(i, { icon: e.target.value as SpotlightCard["icon"] })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                  {SPOTLIGHT_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={card.title} onChange={(v) => setCard(i, { title: v })} />
            </div>
            <div>
              <Label>Text</Label>
              <Textarea value={card.body} onChange={(v) => setCard(i, { body: v })} rows={2} />
            </div>
          </div>
        ))}
        {sp.cards.length > 0 && (
          <div className={`rounded-xl px-3 py-3 space-y-2 border ${sp.doctorReviewed ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={sp.doctorReviewed}
                onChange={(e) => set({ spotlight: { ...sp, doctorReviewed: e.target.checked } })}
              />
              <span>
                <span className="font-semibold">Card text checked by a doctor.</span> Required before this spotlight can go live,
                because cards often carry skin or health advice. Editing any card clears this tick.
              </span>
            </label>
            <div>
              <Label>Checked by (optional, internal only)</Label>
              <Input value={sp.reviewedBy} onChange={(v) => set({ spotlight: { ...sp, reviewedBy: v } })} placeholder="Doctor's name" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Closing</p>
        <div>
          <Label>Closing line (optional)</Label>
          <Input value={sp.closingLine} onChange={(v) => update({ closingLine: v })} placeholder="e.g. Wishing you a safe and bright Diwali." />
        </div>
        <div>
          <Label>Small note (optional)</Label>
          <Input value={sp.disclaimer} onChange={(v) => update({ disclaimer: v })} placeholder="e.g. These are general tips. For advice about your own skin, talk to a dermatologist." />
        </div>
        <p className="text-xs text-gray-400">The button comes from the Call to Action tab.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Effects</p>
        <Toggle checked={sp.effects.sparkles} onChange={(v) => update({ effects: { ...sp.effects, sparkles: v } })} label="Sparkles and rising embers" />
        <Toggle checked={sp.effects.fireworks} onChange={(v) => update({ effects: { ...sp.effects, fireworks: v, sound: v ? sp.effects.sound : false } })} label="Fireworks in the background (festivals)" />
        {sp.effects.fireworks && (
          <div className="pl-4 space-y-2">
            <Toggle checked={sp.effects.sound} onChange={(v) => update({ effects: { ...sp.effects, sound: v } })} label="“Tap for fireworks” button with sound (plays only when tapped)" />
            {sp.effects.sound && (
              <div>
                <Label>Button text</Label>
                <Input value={sp.soundLabel} onChange={(v) => update({ soundLabel: v })} placeholder="Tap for fireworks" />
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400">Visitors who turn on reduced motion in their phone settings see everything without animation.</p>
      </div>
    </div>
  );
}
