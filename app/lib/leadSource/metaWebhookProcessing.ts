import crypto from "crypto";
import Connector from "@/app/models/Connector";
import ConnectorCredential from "@/app/models/ConnectorCredential";
import ConnectorFieldMapping from "@/app/models/ConnectorFieldMapping";
import { applyFieldMapping, type MappingFieldDef } from "@/app/lib/crm/fieldMapping";
import { decryptCredential } from "@/app/lib/crm/encryption";
import { normalizePhone } from "@/app/lib/phone";
import {
  deriveLeadSourceAttribution,
  finalizeLeadSourceBooking,
  type LeadSourceWebhookResult,
} from "@/app/lib/leadSource/webhookProcessing";
import { fetchMetaLead, fetchMetaFormQuestions, fetchMetaCampaignName, type MetaLeadFieldData } from "@/app/lib/leadSource/metaGraphApi";

// Meta Lead Ads — ONE connector receives every form/campaign/ad Meta ever
// sends (see app/models/Connector.ts's own comment: a Connector is a
// provider/account, never a form). This file is the Meta-specific FRONT
// half (webhook envelope shape, Graph API lookups, dynamic-answer
// normalization) that hands off to the EXACT SAME shared back half
// (finalizeLeadSourceBooking, in webhookProcessing.ts) every other
// lead_source provider already uses — branch resolution, dedup,
// Booking create/update, qualification, capacity, WhatsApp alert are all
// reused unchanged, not reimplemented here.
//
// Why a SEPARATE file/route from the generic lead-source receiver, rather
// than reusing app/api/webhooks/lead-source/[connectorId]/route.ts
// directly: Meta's protocol is genuinely different in shape — a GET
// verification handshake, X-Hub-Signature-256 (not the generic connector
// HMAC header), and a POST body that's a BATCH envelope
// (entry[].changes[]) potentially containing multiple leads, not one flat
// lead payload per request. This is the exact same reasoning already
// documented in app/lib/whatsapp/inboundSecurity.ts for why WhatsApp's
// inbound webhook doesn't share the generic receiver either — Meta Lead
// Ads follows that same established precedent, parameterized per-Connector
// instead of global env vars (WhatsApp isn't a Connector row; this must be).

// ── Credential ───────────────────────────────────────────────────────────

export interface MetaConnectorCredential {
  accessToken: string;
  appSecret: string;
  verifyToken: string;
}

// Stored as one encrypted JSON blob under ConnectorCredential.authType
// "bearer" — the exact same mechanism/model the CRM connector already uses
// (app/api/admin/integrations/crm/credentials/route.ts), just scoped to
// this connector instead of the singleton CRM one. No new model, no new
// encryption code.
export async function getMetaCredential(connectorId: string): Promise<MetaConnectorCredential | null> {
  const cred = await (ConnectorCredential as any).findOne({ connectorId }).lean();
  if (!cred?.encrypted) return null;
  try {
    const parsed = JSON.parse(decryptCredential({ encrypted: cred.encrypted, iv: cred.iv, authTag: cred.authTag }));
    if (!parsed?.accessToken) return null;
    return { accessToken: String(parsed.accessToken), appSecret: String(parsed.appSecret || ""), verifyToken: String(parsed.verifyToken || "") };
  } catch {
    return null;
  }
}

// ── Security — mirrors app/lib/whatsapp/inboundSecurity.ts's exact
// verifyMetaSignature/verifyMetaChallenge shape, parameterized (secret
// comes from THIS connector's own credential, not a global env var) ──────

export function verifyMetaLeadSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!appSecret || !signatureHeader) return false;
  const provided = signatureHeader.replace(/^sha256=/, "");
  try {
    const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifyMetaLeadChallenge(mode: string | null, token: string | null, verifyToken: string): boolean {
  return mode === "subscribe" && !!token && !!verifyToken && token === verifyToken;
}

// ── Webhook envelope parsing ─────────────────────────────────────────────

export interface MetaLeadgenChange {
  leadgenId: string;
  pageId: string;
  formId: string;
  adId: string;
  adSetId: string;
  createdTime: string;
}

// Mirrors app/lib/whatsapp/inboundProcessing.ts's extractInboundMessages()
// exactly — same entry[].changes[] envelope Meta uses for every product
// (WhatsApp messages, Lead Ads, Page events), just filtered to
// field === "leadgen" and a different `value` shape. A single POST can
// legitimately carry multiple leadgen events (different forms, even
// different pages under one app) — every one is processed.
export function extractLeadgenEvents(payload: unknown): MetaLeadgenChange[] {
  const out: MetaLeadgenChange[] = [];
  const entries = Array.isArray((payload as any)?.entry) ? (payload as any).entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      if (change?.field !== "leadgen") continue;
      const value = change?.value || {};
      const leadgenId = String(value?.leadgen_id || "");
      if (!leadgenId) continue; // malformed change — nothing to fetch, skip rather than crash
      out.push({
        leadgenId,
        pageId: String(value?.page_id || entry?.id || ""),
        formId: String(value?.form_id || ""),
        adId: String(value?.ad_id || ""),
        adSetId: String(value?.adgroup_id || ""), // Meta's webhook field is literally "adgroup_id" (legacy naming), not "adset_id"
        createdTime: String(value?.created_time || ""),
      });
    }
  }
  return out;
}

// ── Dynamic answer normalization (Part 7/8/9 of the spec) ───────────────

export type MetaAnswerType = "text" | "single_choice" | "multiple_choice" | "boolean" | "number" | "date" | "unknown";

export interface CustomAnswer {
  questionId: string;
  question: string;
  answer: unknown;
  answerType: MetaAnswerType;
}

// Best-effort type inference — Meta's leadgen field_data gives you a
// {name, values[]} pair, NOT an explicit answer-type enum. `values` is
// ALWAYS an array (length 1 for text/single-choice/boolean/number/date,
// length >1 only for a genuine multi-select) — that length is the one
// SIGNAL Meta reliably gives for free, which is exactly what keeps a
// multiple_choice answer from ever collapsing into "[object Object]" or a
// lost value (Part 9): it's never coerced into a scalar in the first
// place. Beyond that length check, "text" vs "single_choice" specifically
// genuinely cannot be told apart from the value alone — both are a
// length-1 array — so `formQuestionType` (from fetchMetaFormQuestions,
// itself best-effort) is consulted when available; without it, this
// degrades to "text" rather than guessing single_choice, which is the
// safer direction to be wrong in (a staff member reading "text" when it
// was really a dropdown loses nothing — the raw answer is identical
// either way; the reverse could imply options that were never shown).
export function inferAnswerType(values: unknown[], formQuestionType?: string): MetaAnswerType {
  if (values.length > 1) return "multiple_choice";
  const type = (formQuestionType || "").toUpperCase();
  if (type.includes("MULTI") || type.includes("CHECKBOX")) return "multiple_choice";
  if (type.includes("DATE") || type === "DOB") return "date";
  if (type.includes("GENDER") || type.includes("YES_NO") || type.includes("BOOLEAN")) return "boolean";
  if (type.includes("CHOICE") || type.includes("SELECT") || type.includes("RADIO") || type.includes("DROPDOWN")) return "single_choice";

  const v = values[0];
  if (v === undefined || v === null) return "unknown";
  const s = String(v).trim();
  if (!s) return "unknown";
  if (/^(yes|no|true|false)$/i.test(s)) return "boolean";
  if (/^-?\d+(\.\d+)?$/.test(s)) return "number";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return "date";
  return "text";
}

export interface NormalizedMetaLead {
  mapped: Record<string, unknown>; // standard fields, translated via the EXISTING ConnectorFieldMapping mechanism
  missingRequired: string[];
  customAnswers: CustomAnswer[]; // everything NOT covered by a standard-field mapping
}

// Splits Meta's field_data into (a) the standard fields an admin has
// explicitly mapped (name/phone/email/gender/...), via the EXACT SAME
// applyFieldMapping() every other lead_source provider already uses — no
// new mapping mechanism — and (b) everything else, preserved as a
// customAnswers entry rather than silently discarded. This is the direct
// fix for the architecture gap found during investigation
// (webhookProcessing.ts previously only ever read a fixed key whitelist
// off `mapped`, dropping anything not on that list).
export function normalizeMetaAnswers(
  fieldData: MetaLeadFieldData[],
  mappingFields: MappingFieldDef[],
  formQuestionLabels: Record<string, { label: string; type: string }>
): NormalizedMetaLead {
  // A flat, single-value view for applyFieldMapping's standard-field pass
  // (name/phone/email/gender are always length-1 in practice — Meta
  // wouldn't offer a multi-select "phone number" field).
  const flat: Record<string, unknown> = {};
  for (const f of fieldData) flat[f.name] = f.values?.[0];

  const { mapped, missingRequired } = applyFieldMapping(flat, mappingFields, "pull");
  const mappedExternalFields = new Set(mappingFields.map((f) => f.externalField));

  const customAnswers: CustomAnswer[] = [];
  for (const f of fieldData) {
    if (mappedExternalFields.has(f.name)) continue; // already became a standard field above
    const values = Array.isArray(f.values) ? f.values : [];
    const formQ = formQuestionLabels[f.name];
    customAnswers.push({
      questionId: f.name,
      // Falls back to the raw field key when form-question label lookup
      // failed or wasn't attempted — still recoverable/readable, never
      // "undefined" or blank (Part 8: preserve original question data).
      question: formQ?.label || f.name,
      // A single value collapses to a scalar for readability; a real
      // multi-select stays a real array — never "[object Object]" (Part 9).
      answer: values.length === 1 ? values[0] : values,
      answerType: inferAnswerType(values, formQ?.type),
    });
  }

  return { mapped, missingRequired, customAnswers };
}

// ── Orchestration ─────────────────────────────────────────────────────────

async function getIntakeMapping(connectorId: string): Promise<MappingFieldDef[]> {
  const doc = await (ConnectorFieldMapping as any)
    .findOne({ connectorId, capability: "intake", direction: "pull" })
    .lean();
  return doc?.fields || [];
}

// The Meta-specific counterpart to processLeadSourceWebhookEvent — same
// job (turn one provider event into one Booking), different front half.
// Called once per leadgen event extracted from a webhook POST (a single
// POST can carry several).
export async function processMetaLeadEvent(connectorId: string, change: MetaLeadgenChange): Promise<LeadSourceWebhookResult> {
  const connector = await (Connector as any).findById(connectorId).lean();
  if (!connector || connector.type !== "lead_source") {
    return { processed: false, reason: "Not a lead_source connector" };
  }

  const credential = await getMetaCredential(connectorId);
  if (!credential?.accessToken) {
    return { processed: false, reason: "This connector has no Meta access token configured yet — set it in Lead Sources before it can fetch lead data." };
  }

  const leadResult = await fetchMetaLead(change.leadgenId, credential.accessToken);
  // `leadResult.ok === false` (not `!leadResult.ok`) — a real TypeScript
  // 5.4.5 narrowing limitation on generic discriminated unions confirmed
  // via isolated reproduction: negation-based narrowing (`!x.ok`) fails to
  // narrow a generic union alias's other fields here, while an explicit
  // `=== false` comparison narrows correctly. Purely a type-checker
  // workaround — runtime behavior is identical either way.
  if (leadResult.ok === false) {
    if (leadResult.expiredToken) {
      return { processed: false, reason: "Meta access token is expired or invalid — reconnect this connector's credentials." };
    }
    // Retryable failures (rate limit, timeout) are reported as a normal
    // "not processed" result — the webhook route still returns 200 (Meta
    // doesn't get a signal to retry from this shape), consistent with
    // every other lead_source provider's own "log it, don't 500" contract.
    // A genuinely dropped lead here is visible in ConnectorWebhookEvent's
    // logged raw payload for manual reprocessing, same safety net as
    // JustDial/IndiaMART already have.
    return { processed: false, reason: `Meta API error: ${leadResult.error}` };
  }

  const lead = leadResult.data;

  const fields = await getIntakeMapping(connectorId);
  // Unlike JustDial/IndiaMART/Google Lead Form, an empty mapping is NOT a
  // hard stop here — Meta's standard fields (name/phone/email/gender) DO
  // need at least a phone mapping to route the lead (see the check just
  // below), but a connector with zero mapping configured yet would
  // otherwise lose every field into customAnswers, including name/phone.
  // Surfacing the same clear "configure it first" message as the other
  // providers is more useful than silently degrading.
  if (!fields.length) {
    return { processed: false, reason: `No "Intake" field mapping configured yet for this connector — map at least phone before it can receive leads.` };
  }

  // Form question labels are best-effort — a failure here still lets the
  // lead through (see normalizeMetaAnswers's own fallback to the raw
  // field key as the question text).
  const formQuestionLabels = await fetchMetaFormQuestions(change.formId, credential.accessToken);

  const { mapped, missingRequired, customAnswers } = normalizeMetaAnswers(lead.field_data, fields, formQuestionLabels);
  if (missingRequired.length) {
    return { processed: false, reason: `Missing required field(s): ${missingRequired.join(", ")}` };
  }

  const phone = normalizePhone(String(mapped.phone ?? ""));
  if (!phone) {
    return { processed: false, reason: "phone is required to record a lead (map it in Field Mapping)." };
  }

  const name = String(mapped.name ?? "").trim() || "Unknown Lead";
  const service = String(mapped.service ?? "");

  // pageId plays the EXACT SAME role providerAccountId already plays for
  // JustDial/IndiaMART (see resolveBranch.ts) — a multi-branch clinic with
  // one Meta Page per branch routes correctly through the EXISTING
  // LeadSourceMapping mechanism, no new branch-routing concept needed.
  const providerAccountId = change.pageId;
  const providerPhone = "";

  const { attributionSource, conversionChannel } = deriveLeadSourceAttribution("meta_lead_form");

  // Campaign NAME is best-effort (see fetchMetaCampaignName) — reuses the
  // EXISTING utmCampaign field (never a new one) so Meta leads show up in
  // the same campaign-attribution views Google/website leads already do.
  const campaignName = lead.campaign_id ? await fetchMetaCampaignName(lead.campaign_id, credential.accessToken) : "";

  const result = await finalizeLeadSourceBooking({
    source: "meta_lead_form",
    providerAccountId,
    providerPhone,
    // Meta ALWAYS supplies a leadgen_id on every real event — unlike
    // JustDial/IndiaMART, Meta leads are deduplicated from day one (Part
    // 12), reusing the exact same buildDedupQuery mechanism, unmodified.
    externalId: change.leadgenId,
    conversionChannel,
    name,
    phone,
    service,
    fieldsToSet: {
      email: String(mapped.email ?? ""),
      gender: String(mapped.gender ?? ""),
      notes: String(mapped.notes ?? ""),
      source: attributionSource,
      utmCampaign: campaignName,
      // A Meta Lead Ads form can only ever run on a paid Meta campaign —
      // same "knowable by definition" reasoning webhookProcessing.ts
      // already uses for Google Lead Form's implicit "cpc".
      utmMedium: "cpc",
      customAnswers,
      providerMeta: {
        formId: change.formId,
        formName: "", // form NAME (not just ID) would need its own Graph API call — not fetched here to keep this MVP's Graph API call count minimal; formId alone is always present and sufficient to identify the form
        adId: change.adId,
        adSetId: change.adSetId,
        campaignId: lead.campaign_id || "",
      },
    },
  });

  return result;
}
