import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Review } from '@/app/models/Review';

export async function POST() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Add GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID to your .env.local file to enable Google Reviews sync.',
      },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}&language=en&reviews_sort=newest`,
      { cache: 'no-store' }
    );
    const json = await res.json();

    if (json.status !== 'OK') {
      return NextResponse.json(
        { success: false, message: `Google Places API error: ${json.status} — ${json.error_message || ''}` },
        { status: 400 }
      );
    }

    const googleReviews: any[] = json.result?.reviews || [];
    if (googleReviews.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: 'No reviews found on this Place ID.' });
    }

    await connectDB();

    let synced = 0;
    let created = 0;

    for (const gr of googleReviews) {
      // Use author_url + timestamp as stable unique ID (Google doesn't expose a review ID)
      const sourceId = `${gr.author_url ?? gr.author_name}_${gr.time}`;

      const result = await Review.findOneAndUpdate(
        { source: 'google', sourceId } as any,
        {
          $set: {
            authorName: gr.author_name,
            authorAvatar: gr.profile_photo_url || '',
            rating: gr.rating,
            reviewText: gr.text || '',
            isVisible: true,
            showOnHomepage: gr.rating >= 4,
            reviewDate: new Date(gr.time * 1000),
            syncedAt: new Date(),
            meta: {
              authorUrl: gr.author_url,
              language: gr.language,
            },
          },
          $setOnInsert: {
            source: 'google',
            sourceId,
            isFeatured: false,
            displayOrder: 0,
            services: [],
            location: '',
          },
        },
        { upsert: true, new: true }
      );

      synced++;
      if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    }

    return NextResponse.json({
      success: true,
      synced,
      created,
      updated: synced - created,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
