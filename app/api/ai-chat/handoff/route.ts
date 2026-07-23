import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Conversation } from '@/app/models/Conversation';

export const dynamic = 'force-dynamic';

// Fired when a visitor clicks "Continue on WhatsApp" in the chat widget —
// the only thing that makes the WhatsApp Handoffs analytics stat real
// instead of permanently zero.
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ success: false }, { status: 400 });
    await connectDB();
    await (Conversation as any).updateOne({ sessionId }, { $set: { handedOffToWhatsApp: true } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
