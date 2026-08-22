// Internal platform domain types — the ONLY shapes the website, CMS,
// dashboard, patient portal, and AI modules are allowed to depend on.
// CRMConnector translates to/from whatever the actual CRM's API returns;
// nothing outside app/lib/crm/ ever sees a raw CRM response. If the CRM
// changes its field names, endpoints, or response format, only
// CRMConnector.ts (and the ConnectorFieldMapping rows) change — these
// types, and everything that imports them, stay exactly the same.

export interface PlatformDoctor {
  externalId: string;
  name: string;
  active: boolean;
  locations: string[]; // branch keys, e.g. ["chennai"]
}

export interface PlatformBranch {
  externalId: string;
  name: string;
  active: boolean;
}

// Outbound — website is the source, pushed to the CRM.
export interface PlatformLead {
  name: string;
  phone: string;
  email?: string;
  service?: string;
  location?: string;
  source: string; // "website" | "landing-page"
  notes?: string;
  // Lead Qualification Engine output — optional, since a lead created
  // while the engine is disabled (or scored before this field existed)
  // has neither. No special-casing needed to carry these to a CRM: they
  // flow through applyFieldMapping()/TRANSFORM_REGISTRY like any other
  // field, mapped via a ConnectorFieldMapping row only if the CRM
  // actually has a matching field to receive them.
  leadScore?: number;
  leadTemperature?: string;
  // Marketing attribution (Phase 2) — additive, optional. Only ever reaches
  // the external CRM if an admin has actually mapped one of these fields in
  // ConnectorFieldMapping (capability "lead"/"booking", direction "push");
  // otherwise applyFieldMapping() simply never reads it, exactly like
  // leadScore/leadTemperature above. Our internal attribution is complete
  // regardless of what the external CRM can or can't store.
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  conversionChannel?: string;
  clickId?: string;
  clickIdType?: string;
  attributionId?: string;
}

export interface PlatformBooking extends PlatformLead {
  bookingId: string;
  date?: string;
  time?: string;
  concern?: string;
}

export interface ConnectorPushResult {
  externalId: string;
}

// Inbound — CRM is the source, delivered via webhook (not polled). A lead
// your staff logs directly in the CRM (a phone enquiry, a walk-in) rather
// than one that started on the website.
export interface PlatformInboundLead {
  externalId: string;
  name: string;
  phone: string;
  email?: string;
  service?: string;
  location?: string;
  notes?: string;
}

// Inbound — CRM is the source, delivered via webhook. One invoice/bill,
// carrying patient + doctor + treatment + amount together, since that's
// how a real billing system already bundles them — no separate pull for
// "patient info" or "treatment info" on their own.
export interface PlatformInvoice {
  externalId: string;
  invoiceNumber?: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  doctorName?: string;
  branch?: string;
  treatments: string[];
  amount: number;
  amountPaid: number;
  status?: string; // "paid" | "partial" | "unpaid" — free string, CRM-defined
  invoiceDate?: string; // ISO date
}
