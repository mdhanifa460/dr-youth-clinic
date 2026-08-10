import mongoose from "mongoose";

// One record per CRM invoice, delivered via the CRM webhook (invoice.created
// / invoice.updated) — see app/lib/crm/webhookProcessing.ts. Patient,
// doctor, treatment, and amount all live on the one record because that's
// how a real billing system already bundles them; there's no separate
// "patient" or "treatment" pull anywhere in this platform to keep in sync
// with it. `externalId` is the CRM's own invoice id — upserted on, so a
// re-sent webhook (retry, or invoice.updated after invoice.created) updates
// the same row rather than duplicating it.
const InvoiceSchema = new mongoose.Schema(
  {
    connectorId: { type: mongoose.Schema.Types.ObjectId, ref: "Connector", required: true },
    externalId: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, default: "" },

    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    patientEmail: { type: String, default: "" },

    doctorName: { type: String, default: "" },
    branch: { type: String, default: "" },
    treatments: { type: [String], default: [] },

    amount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    status: { type: String, default: "" },
    invoiceDate: { type: Date, default: null },

    // Best-effort link to an existing Booking by phone — set if found,
    // never required. Lets an admin see "this patient enquired on the
    // website, and here's what they were later billed" without forcing
    // every invoice to have a matching website lead (most won't — existing
    // patients, walk-ins, and phone bookings never touch the website).
    matchedBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },

    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

InvoiceSchema.index({ patientPhone: 1 });
InvoiceSchema.index({ invoiceDate: -1 });

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
