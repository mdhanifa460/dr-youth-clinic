import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { LegalContent, getLegalContent } from '@/app/models/LegalContent';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET() {
  const denied = await requirePermission('legal', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const content = await getLegalContent();
    return NextResponse.json({ success: true, data: content });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch legal content' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission('legal', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    // The admin page round-trips the full object it GET-ed (including
    // _id/createdAt/updatedAt/__v) back on save — strip those immutable/
    // managed fields before $set rather than relying on every caller to
    // remember to omit them (MongoDB rejects $set-ing _id outright).
    const { _id, createdAt, updatedAt, __v, ...body } = await req.json();
    const existing = await LegalContent.findOne({} as any).lean();

    let updated;
    if (existing) {
      updated = await (LegalContent as any).findByIdAndUpdate(existing._id, { $set: body }, { returnDocument: 'after', runValidators: true });
    } else {
      updated = await LegalContent.create(body);
    }

    revalidateTag('legal-content');
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save legal content' }, { status: 500 });
  }
}
