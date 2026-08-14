import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { CourseEnquiry } from '@/app/models/CourseEnquiry';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone, isValidIndianMobile, INVALID_MOBILE_MESSAGE } from '@/app/lib/phone';
import { getClinicNotifyNumber } from '@/app/lib/clinicNotify';
import { sendWhatsAppText } from '@/app/lib/whatsapp';
// Registers Course with Mongoose for the ref lookup on create.
import '@/app/models/Course';

function notifyClinicWhatsApp(body: string, to: string | undefined) {
  if (!to) return;
  sendWhatsAppText(to, body).then((r) => {
    if (!r.success) console.log('❌ Course enquiry WhatsApp alert failed:', r.error);
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`course-enquiries:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { name, phone, email, practiceOrClinicName, city, course, message } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ success: false, message: 'Mobile number is required' }, { status: 400 });
    }
    if (!isValidIndianMobile(phone)) {
      return NextResponse.json({ success: false, message: INVALID_MOBILE_MESSAGE }, { status: 400 });
    }
    if (!course || typeof course !== 'string') {
      return NextResponse.json({ success: false, message: 'Course is required' }, { status: 400 });
    }

    await connectDB();

    const enquiry = await (CourseEnquiry as any).create({
      name: name.trim(),
      phone: normalizePhone(phone),
      email: (email || '').trim(),
      practiceOrClinicName: (practiceOrClinicName || '').trim(),
      city: (city || '').trim(),
      course,
      message: (message || '').trim(),
      source: 'academy-courses',
    });

    getClinicNotifyNumber(undefined).then((to) => {
      notifyClinicWhatsApp(
        `🎓 New Certification Course Enquiry\n\nName: ${name.trim()}\nPhone: ${phone}${practiceOrClinicName ? `\nPractice/Clinic: ${practiceOrClinicName}` : ''}${city ? `\nCity: ${city}` : ''}`,
        to
      );
    }).catch(() => {});

    return NextResponse.json({ success: true, enquiryId: String(enquiry._id) });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed' }, { status: 500 });
  }
}
