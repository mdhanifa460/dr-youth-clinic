'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader } from 'lucide-react';
import VideoForm from '@/app/admin/components/VideoForm';

export default function EditVideoPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/videos/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setVideo(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="space-y-4">
      <Link href="/admin/videos" className="text-blue-600 hover:underline text-sm">
        ← Back to Video Academy
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">Edit Video</h1>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : video ? (
        <VideoForm initialData={video} />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-red-600">Video not found</p>
        </div>
      )}
    </div>
  );
}
