'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader } from 'lucide-react';
import AnimationAssetForm from '@/app/admin/components/AnimationAssetForm';

export default function EditAnimationAssetPage({ params }: { params: { id: string } }) {
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/animation-assets/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setAsset(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="space-y-4">
      <Link href="/admin/animation-library" className="text-blue-600 hover:underline text-sm">
        ← Back to Animation Library
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">Edit Animation Asset</h1>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : asset ? (
        <AnimationAssetForm initialData={asset} />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-red-600">Animation asset not found</p>
        </div>
      )}
    </div>
  );
}
