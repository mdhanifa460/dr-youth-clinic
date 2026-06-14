'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ServiceForm from '@/app/admin/components/ServiceForm';
import { Loader } from 'lucide-react';

export default function EditServicePage({
  params,
}: {
  params: { id: string };
}) {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchService();
  }, []);

  const fetchService = async () => {
    try {
      const res = await fetch(`/api/admin/services/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setService(data.data);
      }
    } catch (error) {
      console.error('Error fetching service:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link href="/admin/services" className="text-blue-600 hover:underline">
        ← Back to Services
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">Edit Service</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : service ? (
        <ServiceForm initialData={service} />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-red-600">Service not found</p>
        </div>
      )}
    </div>
  );
}
