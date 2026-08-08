import Connector from "@/app/models/Connector";
import ConnectorCredential from "@/app/models/ConnectorCredential";
import ConnectorFieldMapping from "@/app/models/ConnectorFieldMapping";
import ConnectorLog from "@/app/models/ConnectorLog";
import { decryptCredential } from "./encryption";
import { applyFieldMapping } from "./fieldMapping";
import type { PlatformDoctor, PlatformBranch, PlatformLead, PlatformBooking, ConnectorPushResult } from "./types";
import { getClinicNotifyNumber } from "@/app/lib/clinicNotify";
import { sendWhatsAppText } from "@/app/lib/whatsapp";

// The one connector this platform talks to a third-party CRM through (see
// the Enterprise Connector Framework review — Rev. 2). One class, many
// exposed methods, no per-capability connector classes. Every method here
// accepts/returns only the platform types in ./types — raw CRM request/
// response shapes never leak past `request()`, so a CRM changing its field
// names or endpoints only ever means editing config/mapping rows, never
// this file's callers.
//
// Auth type, base URL, per-operation endpoint paths, and field mappings are
// all data (Connector/ConnectorCredential/ConnectorFieldMapping documents),
// not hardcoded — this class works against any REST-based CRM once those
// rows are configured from the Sync Manager admin page.

type PullOperation = "getDoctors" | "getBranches";
type PushOperation = "pushWebsiteLead" | "pushWebsiteBooking";
type Operation = PullOperation | PushOperation | "healthCheck";

export class ConnectorNotConfiguredError extends Error {}
export class ConnectorMappingMissingError extends Error {}

interface RequestOutcome<T> {
  ok: boolean;
  data?: T;
  status?: number;
  latencyMs: number;
  error?: string;
}

export class CRMConnector {
  private connectorDoc: any;

  private constructor(connectorDoc: any) {
    this.connectorDoc = connectorDoc;
  }

  // Loads the single active CRM connector row. Returns null rather than
  // throwing when none exists/none is active — every caller (push paths in
  // particular) treats "no CRM configured yet" as a normal, silent no-op,
  // never a website-facing error.
  static async loadActive(): Promise<CRMConnector | null> {
    const doc = await (Connector as any).findOne({ type: "crm", status: "active" }).lean();
    return doc ? new CRMConnector(doc) : null;
  }

  static async loadAny(): Promise<CRMConnector | null> {
    const doc = await (Connector as any).findOne({ type: "crm" }).sort({ createdAt: 1 }).lean();
    return doc ? new CRMConnector(doc) : null;
  }

  get id(): string {
    return String(this.connectorDoc._id);
  }

  // ── Core request plumbing ──────────────────────────────────────────────

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const cred = await (ConnectorCredential as any).findOne({ connectorId: this.connectorDoc._id }).lean();
    if (!cred) return {};

    const payload = JSON.parse(
      decryptCredential({ encrypted: cred.encrypted, iv: cred.iv, authTag: cred.authTag })
    );

    switch (cred.authType) {
      case "api_key":
        return { "X-API-Key": payload.key };
      case "bearer":
        return { Authorization: `Bearer ${payload.token}` };
      case "basic":
        return { Authorization: `Basic ${Buffer.from(`${payload.username}:${payload.password}`).toString("base64")}` };
      case "custom_header":
        return payload.headers || {};
      case "jwt":
        return { Authorization: `Bearer ${payload.token}` };
      case "oauth2":
        // Phase 1 scope: static bearer token from the stored payload.
        // Automatic refresh-token exchange lands when a real OAuth2 CRM is
        // the target — see the architecture review §07 for the intended
        // shape (mint on demand, cache in-memory, refresh transparently).
        return { Authorization: `Bearer ${payload.accessToken || ""}` };
      default:
        return {};
    }
  }

  private resolveUrl(operation: Operation): string | null {
    const baseUrl: string = this.connectorDoc.config?.baseUrl || "";
    const endpoints: Record<string, string> = this.connectorDoc.config?.endpoints || {};
    const path = endpoints[operation];
    if (!baseUrl || !path) return null;
    return baseUrl.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`);
  }

  private async request<T = unknown>(
    operation: Operation,
    direction: "push" | "pull",
    method: "GET" | "POST",
    body?: unknown
  ): Promise<RequestOutcome<T>> {
    const started = Date.now();
    const url = this.resolveUrl(operation);

    if (!url) {
      return { ok: false, latencyMs: 0, error: `No endpoint configured for "${operation}" — set it in Sync Manager → Config.` };
    }

    const timeoutMs = this.connectorDoc.config?.timeoutMs || 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let outcome: RequestOutcome<T>;
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const latencyMs = Date.now() - started;
      const text = await res.text();
      let data: any;
      try { data = text ? JSON.parse(text) : undefined; } catch { data = { raw: text }; }

      outcome = res.ok
        ? { ok: true, data, status: res.status, latencyMs }
        : { ok: false, data, status: res.status, latencyMs, error: data?.message || `CRM API error (${res.status})` };
    } catch (e: any) {
      outcome = {
        ok: false,
        latencyMs: Date.now() - started,
        error: e?.name === "AbortError" ? `Timed out after ${timeoutMs}ms` : e?.message || "Network error calling CRM",
      };
    } finally {
      clearTimeout(timer);
    }

    await this.logAttempt(operation, direction, outcome);
    await this.updateHealth(outcome.ok, outcome.latencyMs);
    return outcome;
  }

  private async logAttempt(operation: string, direction: "push" | "pull", outcome: RequestOutcome<unknown>) {
    try {
      await (ConnectorLog as any).create({
        connectorId: this.connectorDoc._id,
        direction,
        operation,
        status: outcome.ok ? "success" : "failed",
        httpStatus: outcome.status ?? null,
        latencyMs: outcome.latencyMs,
        errorMessage: outcome.error || "",
      });
    } catch {
      // Logging must never take down the actual sync/push attempt.
    }
  }

  private async updateHealth(ok: boolean, latencyMs: number) {
    try {
      const consecutiveFailures = ok ? 0 : (this.connectorDoc.health?.consecutiveFailures || 0) + 1;
      // 5 consecutive failures trips the circuit breaker — status flips to
      // "error" so scheduled sync/push stop hammering a dead CRM until a
      // manual Test Connection (or the next scheduled health check)
      // succeeds. See architecture review §10.
      const wasAlreadyError = this.connectorDoc.status === "error";
      const nextStatus = !ok && consecutiveFailures >= 5 ? "error" : undefined;

      await (Connector as any).findByIdAndUpdate(this.connectorDoc._id, {
        $set: {
          "health.lastCheckAt": new Date(),
          "health.lastCheckOk": ok,
          "health.avgResponseMs": latencyMs,
          "health.consecutiveFailures": consecutiveFailures,
          ...(nextStatus ? { status: nextStatus } : {}),
        },
      });
      this.connectorDoc.health = { ...this.connectorDoc.health, consecutiveFailures };
      if (nextStatus) this.connectorDoc.status = nextStatus;

      // Alert once on the transition into "error", not on every subsequent
      // failed attempt while it stays down — reuses the existing staff
      // WhatsApp alert path rather than a new alerting channel.
      if (nextStatus && !wasAlreadyError) {
        getClinicNotifyNumber(undefined)
          .then((to) => {
            if (!to) return;
            return sendWhatsAppText(
              to,
              `⚠️ CRM connector "${this.connectorDoc.name}" has failed ${consecutiveFailures} times in a row and is now paused. Check Sync Manager → CRM Sync in admin.`
            );
          })
          .catch(() => {});
      }
    } catch {
      // Health bookkeeping is best-effort, never allowed to fail the caller.
    }
  }

  private async getMapping(capability: string, direction: "push" | "pull") {
    const mapping = await (ConnectorFieldMapping as any)
      .findOne({ connectorId: this.connectorDoc._id, capability, direction })
      .lean();
    return mapping?.fields || [];
  }

  // ── Connection health ───────────────────────────────────────────────────

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; message?: string }> {
    if (!this.connectorDoc.config?.baseUrl) {
      throw new ConnectorNotConfiguredError("Base URL is not set — configure it in Sync Manager → Config first.");
    }
    const outcome = await this.request("healthCheck", "pull", "GET");
    return { ok: outcome.ok, latencyMs: outcome.latencyMs, message: outcome.error };
  }

  // ── PULL — CRM is the source of truth ──────────────────────────────────

  async getDoctors(): Promise<PlatformDoctor[]> {
    const fields = await this.getMapping("doctor", "pull");
    if (!fields.length) {
      throw new ConnectorMappingMissingError('No "doctor" pull field mapping configured yet — set it in Sync Manager → Field Mapping.');
    }
    const outcome = await this.request<any[]>("getDoctors", "pull", "GET");
    if (!outcome.ok || !Array.isArray(outcome.data)) return [];

    return outcome.data.map((raw) => {
      const { mapped } = applyFieldMapping(raw, fields, "pull");
      return {
        externalId: String(mapped.externalId ?? mapped.id ?? ""),
        name: String(mapped.name ?? ""),
        active: mapped.active !== false,
        // Most CRMs return one branch/city per doctor as a plain string,
        // not an array — normalize either shape rather than silently
        // dropping a valid string value down to an empty list.
        locations: normalizeLocations(mapped.locations),
      };
    }).filter((d) => d.externalId && d.name);
  }

  async getBranches(): Promise<PlatformBranch[]> {
    const fields = await this.getMapping("branch", "pull");
    if (!fields.length) {
      throw new ConnectorMappingMissingError('No "branch" pull field mapping configured yet — set it in Sync Manager → Field Mapping.');
    }
    const outcome = await this.request<any[]>("getBranches", "pull", "GET");
    if (!outcome.ok || !Array.isArray(outcome.data)) return [];

    return outcome.data.map((raw) => {
      const { mapped } = applyFieldMapping(raw, fields, "pull");
      return {
        externalId: String(mapped.externalId ?? mapped.id ?? ""),
        name: String(mapped.name ?? ""),
        active: mapped.active !== false,
      };
    }).filter((b) => b.externalId && b.name);
  }

  // ── PUSH — website is the source ────────────────────────────────────────

  async pushWebsiteLead(lead: PlatformLead): Promise<ConnectorPushResult> {
    return this.push("pushWebsiteLead", "lead", lead as unknown as Record<string, unknown>);
  }

  async pushWebsiteBooking(booking: PlatformBooking): Promise<ConnectorPushResult> {
    return this.push("pushWebsiteBooking", "booking", booking as unknown as Record<string, unknown>);
  }

  private async push(operation: PushOperation, capability: string, payload: Record<string, unknown>): Promise<ConnectorPushResult> {
    const fields = await this.getMapping(capability, "push");
    if (!fields.length) {
      throw new ConnectorMappingMissingError(`No "${capability}" push field mapping configured yet — set it in Sync Manager → Field Mapping.`);
    }
    const { mapped, missingRequired } = applyFieldMapping(payload, fields, "push");
    if (missingRequired.length) {
      throw new Error(`Cannot push ${capability}: missing required field(s) ${missingRequired.join(", ")}.`);
    }

    const outcome = await this.request<any>(operation, "push", "POST", mapped);
    if (!outcome.ok) {
      throw new Error(outcome.error || `${capability} push failed.`);
    }
    return { externalId: String(outcome.data?.id ?? outcome.data?.externalId ?? "") };
  }
}

function normalizeLocations(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).toLowerCase());
  if (typeof value === "string" && value.trim()) return [value.trim().toLowerCase()];
  return [];
}
