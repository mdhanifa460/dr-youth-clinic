import Link from 'next/link';
import CourseForm from '@/app/admin/components/CourseForm';

export const metadata = { title: 'Add Course | DR Youth Clinic Admin' };

export default function NewCoursePage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/courses" className="text-blue-600 hover:underline text-sm">
        ← Back to Certification Programs
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">Add Course</h1>
      <CourseForm />
    </div>
  );
}
