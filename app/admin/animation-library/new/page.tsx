import Link from 'next/link';
import AnimationAssetForm from '@/app/admin/components/AnimationAssetForm';

export const metadata = { title: 'Add Animation Asset | DR Youth Clinic Admin' };

export default function NewAnimationAssetPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/animation-library" className="text-blue-600 hover:underline text-sm">
        ← Back to Animation Library
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">Add Animation Asset</h1>
      <AnimationAssetForm />
    </div>
  );
}
