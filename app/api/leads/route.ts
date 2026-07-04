import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    source: { type: String, default: 'skin-quiz' },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    recommendations: [String],
  },
  { timestamps: true }
);

const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

export async function POST(req: NextRequest) {
  try {
    const { email, source, answers, recommendations } = await req.json();
    if (!email) return NextResponse.json({ success: false, message: 'Email required' }, { status: 400 });

    await connectDB();
    await Lead.create({ email, source, answers, recommendations });

    // Notify clinic via WhatsApp (fire-and-forget — don't block response)
    if (process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID && process.env.CLINIC_PHONE) {
      const concern = answers?.concern ?? 'Unknown';
      const recs = Array.isArray(recommendations) ? recommendations.join(', ') : '';
      fetch(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: process.env.CLINIC_PHONE,
          type: 'text',
          text: {
            body: `📊 Skin Quiz Lead\n\nEmail: ${email}\nConcern: ${concern}\nRecommended: ${recs || 'N/A'}`,
          },
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed' }, { status: 500 });
  }
}
