import { connectDB } from '@/app/lib/mongodb';
import Booking from '@/app/models/Booking';

interface Props {
  serviceName: string;
  location: string;
}

export default async function SocialProofBar({ serviceName, location }: Props) {
  try {
    await connectDB();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await Booking.countDocuments({
      service: { $regex: serviceName, $options: 'i' },
      createdAt: { $gte: thirtyDaysAgo },
    });

    if (count === 0) return null;

    return (
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-6">
        <div className="inline-flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-full text-sm font-semibold shadow-sm">
          <span className="text-base" aria-hidden="true">🔥</span>
          <span>
            {count} {count === 1 ? 'person' : 'people'} booked this treatment in the last 30 days
            at {location}
          </span>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}
