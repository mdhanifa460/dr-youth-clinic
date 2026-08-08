import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";

export const dynamic = "force-dynamic";

// Single-connector admin surface — Phase 1 ships with exactly one CRM row,
// created on first read (same lazy-create pattern as other singleton-style
// config models in this codebase, e.g. Settings).
async function getOrCreateCrmConnector() {
  let doc = await (Connector as any).findOne({ type: "crm" });
  if (!doc) {
    doc = await (Connector as any).create({ name: "Primary CRM", type: "crm", status: "draft" });
  }
  return doc;
}

export async function GET() {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const connector = await getOrCreateCrmConnector();
  return NextResponse.json({ success: true, data: connector });
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const { name, provider, status, config } = body;

  const connector = await getOrCreateCrmConnector();
  if (name !== undefined) connector.name = name;
  if (provider !== undefined) connector.provider = provider;
  if (status !== undefined && ["active", "paused", "draft"].includes(status)) connector.status = status;
  if (config) {
    connector.config = {
      ...connector.config,
      baseUrl: config.baseUrl ?? connector.config.baseUrl,
      timeoutMs: config.timeoutMs ?? connector.config.timeoutMs,
      retryCount: config.retryCount ?? connector.config.retryCount,
      pullIntervalMin: config.pullIntervalMin ?? connector.config.pullIntervalMin,
      endpoints: config.endpoints ?? connector.config.endpoints,
    };
  }
  await connector.save();

  return NextResponse.json({ success: true, data: connector });
}
