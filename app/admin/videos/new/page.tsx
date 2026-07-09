import Link from 'next/link';
import VideoForm from '@/app/admin/components/VideoForm';

export const metadata = { title: 'Add Video | DR Youth Clinic Admin' };

export default function NewVideoPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/videos" className="text-blue-600 hover:underline text-sm">
        ← Back to Video Academy
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">Add Video</h1>
      <VideoForm />
    </div>
  );
}
