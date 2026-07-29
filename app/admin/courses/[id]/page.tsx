'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader } from 'lucide-react';
import CourseForm from '@/app/admin/components/CourseForm';

export default function EditCoursePage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/courses/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setCourse(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="space-y-4">
      <Link href="/admin/courses" className="text-blue-600 hover:underline text-sm">
        ← Back to Certification Programs
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">Edit Course</h1>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : course ? (
        <CourseForm initialData={course} />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-red-600">Course not found</p>
        </div>
      )}
    </div>
  );
}
