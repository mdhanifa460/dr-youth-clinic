// Shared WhatsApp Cloud API client — the Graph API URL/auth-header
// construction used to be duplicated inline in app/api/booking/route.ts and
// app/api/leads/route.ts, each with its own ad hoc response handling. One
// client here means one place that knows how to talk to Meta, and one place
// that guards against a non-JSON error response turning a real send into an
// uncaught exception (the exact bug fixed in booking/route.ts earlier this
// session — the customer-confirmation call wasn't guarded the same way the
// clinic-notification call was).
const GRAPH_API_URL = () => `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;

type SendResult = { success: boolean; error?: string };

async function post(body: Record<string, unknown>): Promise<SendResult> {
  if (!process.env.WHATSAPP_TOKEN || !process.env.PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp not configured (WHATSAPP_TOKEN/PHONE_NUMBER_ID missing)" };
  }

  try {
    const res = await fetch(GRAPH_API_URL(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      return { success: false, error: data?.error?.message || `WhatsApp API error (${res.status})` };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error calling WhatsApp API" };
  }
}

// Free-form text — only deliverable within Meta's 24h "customer service
// window" after the recipient last messaged the business number (fine for
// the clinic's own staff-alert number, since that's the clinic messaging
// itself; not reliable for arbitrary patient outreach — use sendTemplate
// for anything sent to a patient who hasn't just messaged in).
export async function sendWhatsAppText(to: string, body: string): Promise<SendResult> {
  return post({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

// Template messages are the only reliable way to reach a patient outside
// the 24h window, but every template name used here must already be
// approved in Meta Business Manager — approval has its own lead time
// outside this codebase's control. `params` are positional {{1}}, {{2}}...
// body placeholders, in order.
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: string[],
  languageCode = "en"
): Promise<SendResult> {
  return post({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: params.length
        ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }]
        : undefined,
    },
  });
}
