'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, EyeOff, Loader } from 'lucide-react';
import Image from 'next/image';

interface Service {
  _id: string;
  name: string;
  location: string;
  category: string;
  price: number;
  currency: string;
  duration: number;
  status: 'draft' | 'active' | 'hidden';
  heroImage?: { url: string };
  createdAt: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, [filter]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const query = filter ? `?location=${filter}` : '';
      const res = await fetch(`/api/admin/services${query}`);
      const data = await res.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm('Are you sure?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setServices(services.filter(s => s._id !== id));
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'hidden':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Services</h1>
        <Link href="/admin/services/new">
          <button className="flex gap-2 items-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            <Plus size={20} />
            Add Service
          </button>
        </Link>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-4 py-2 rounded-lg transition ${
            !filter
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Locations
        </button>
        {['chennai', 'bangalore', 'coimbatore', 'kochi'].map((location) => (
          <button
            key={location}
            onClick={() => setFilter(location)}
            className={`px-4 py-2 rounded-lg transition capitalize ${
              filter === location
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {location}
          </button>
        ))}
      </div>

      {/* SERVICES TABLE */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500 mb-4">No services found</p>
          <Link href="/admin/services/new">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Create First Service
            </button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.map((service) => (
                <tr key={service._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex gap-3 items-center">
                      {service.heroImage?.url && (
                        <div className="w-10 h-10 relative rounded">
                          <Image
                            src={service.heroImage.url}
                            alt={service.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <span className="font-semibold text-gray-800">{service.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 capitalize">{service.location}</td>
                  <td className="px-6 py-4 text-gray-600">{service.category}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {service.currency} {service.price}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        service.status
                      )}`}
                    >
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <Link href={`/admin/services/${service._id}`}>
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition">
                        <Edit size={18} />
                      </button>
                    </Link>
                    <button
                      onClick={() => deleteService(service._id)}
                      disabled={deleting === service._id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                    >
                      {deleting === service._id ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
