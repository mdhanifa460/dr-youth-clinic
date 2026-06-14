import ServiceForm from '@/app/admin/components/ServiceForm';
import Link from 'next/link';

export const metadata = {
  title: 'Add New Service | DR Youth Clinic Admin',
};

export default function NewServicePage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/services" className="text-blue-600 hover:underline">
        ← Back to Services
      </Link>
      <h1 className="text-3xl font-bold text-gray-800">Add New Service</h1>
      <p className="text-gray-600">Create a new clinical service offering</p>
      <ServiceForm />
    </div>
  );
}
