import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Conversation } from '@/app/models/Conversation';
import Booking from '@/app/models/Booking';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone, isValidIndianMobile, INVALID_MOBILE_MESSAGE } from '@/app/lib/phone';
import { getClinicNotifyNumber } from '@/app/lib/clinicNotify';
import { sendWhatsAppText } from '@/app/lib/whatsapp';
import { pushBookingToCrm } from '@/app/lib/crm/pushBooking';
import { qualifyAndPersist } from '@/app/lib/leadQualification/persist';
import { buildAttributionFields } from '@/app/lib/utmAttribution';

// Handles BOTH outcomes of the progressive lead-capture prompt
// (app/api/ai-chat/route.ts's 'lead_prompt' event, shown once per session
// after the visitor's first real AI response — never before, never twice):
// sharing contact info, or explicitly declining. Either way marks the
// Conversation as leadCaptured so the prompt never fires again this
// session. Deliberately mirrors the EXISTING "Request a Callback" flow in
// AiChatWidget.tsx's SupportPanel (same Booking shape, same fire-and-forget
// CRM push/qualification/WhatsApp alert pattern already proven there) —
// this is the same kind of lead, just captured passively mid-conversation
// instead of by the visitor explicitly clicking "Request a Callback".
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`ai-chat-lead:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const sessionId = String(body?.sessionId || '').slice(0, 100);
  const skipped = !!body?.skipped;
  if (!sessionId) {
    return NextResponse.json({ success: false, message: 'sessionId is required' }, { status: 400 });
  }

  await connectDB();
  const conversation = await (Conversation as any).findOne({ sessionId });
  if (!conversation) {
    return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
  }

  // Already answered (shared or skipped) earlier — a duplicate submit
  // (e.g. a double-click) is a harmless no-op, not an error.
  if (conversation.leadCaptured) {
    return NextResponse.json({ success: true, alreadyCaptured: true });
  }

  if (skipped) {
    conversation.leadCaptured = true;
    await conversation.save().catch(() => {});
    return NextResponse.json({ success: true, skipped: true });
  }

  const name = String(body?.name || '').trim().slice(0, 100);
  const phoneRaw = String(body?.phone || '').trim();
  const location = String(body?.location || conversation.location || '').slice(0, 30);

  if (!name) {
    return NextResponse.json({ success: false, message: 'Please enter your name' }, { status: 400 });
  }
  if (!isValidIndianMobile(phoneRaw)) {
    return NextResponse.json({ success: false, message: INVALID_MOBILE_MESSAGE }, { status: 400 });
  }
  const formattedPhone = normalizePhone(phoneRaw);

  const attribution = buildAttributionFields((cookieName) => req.cookies.get(cookieName)?.value);

  const booking = await (Booking as any).create({
    name,
    phone: formattedPhone,
    formattedPhone,
    service: 'AI Chat Lead',
    location,
    notes: `Shared contact mid-conversation with the AI chat assistant (session ${sessionId}).`,
    source: body?.source || attribution.utmSource || 'direct',
    conversionChannel: 'website',
    attributionId: req.cookies.get('visitor_id')?.value || '',
    ...attribution,
  });

  pushBookingToCrm(booking).catch(() => {});
  qualifyAndPersist(booking, { reason: 'auto:initial' }).catch(() => {});

  getClinicNotifyNumber(location).then((to) => {
    if (!to) return;
    sendWhatsAppText(
      to,
      `💬 New AI Chat Lead\n\nName: ${name}\nPhone: ${formattedPhone}${location ? `\nLocation: ${location}` : ''}\n\nShared their contact while chatting with the AI assistant.`
    ).then((r) => {
      if (!r.success) console.error('AI chat lead WhatsApp alert failed:', r.error);
    });
  }).catch(() => {});

  conversation.leadCaptured = true;
  conversation.leadName = name;
  conversation.leadPhone = formattedPhone;
  await conversation.save().catch(() => {});

  return NextResponse.json({ success: true, bookingId: booking.bookingId || String(booking._id) });
}
