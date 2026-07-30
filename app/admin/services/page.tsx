'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, EyeOff, Loader, Search } from 'lucide-react';
import Image from 'next/image';
import { getServiceCities } from '@/app/lib/serviceSeo';

interface Service {
  _id: string;
  name: string;
  location: string;
  targetLocations?: string[];
  category: string;
  price: number;
  currency: string;
  duration: number;
  status: 'draft' | 'active' | 'hidden';
  heroImage?: { url: string };
  createdAt: string;
}

const SERVICE_CATEGORIES = ['Skin', 'Hair', 'Laser', 'Other'];

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // The whole catalogue is small enough (well under a hundred documents)
  // to fetch once and filter entirely client-side — location/category/
  // status/search used to each trigger their own fresh server round trip
  // (plus a non-.lean() Mongoose hydration on the API side), so every tab
  // click cost a real network+DB delay even though nothing about the
  // dataset actually changed between clicks.
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/services');
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

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (filter && !getServiceCities(s).includes(filter)) return false;
      if (category && s.category !== category) return false;
      if (status && s.status !== status) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, filter, category, status, search]);

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
      <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {['', ...SERVICE_CATEGORIES].map((c) => (
            <button
              key={c || 'all'}
              onClick={() => setCategory(c)}
              className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition ${
                category === c ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {c || 'All Categories'}
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name..."
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 w-48"
          />
        </div>
        {(category || status || search) && (
          <button
            onClick={() => { setCategory(''); setStatus(''); setSearch(''); }}
            className="text-xs text-gray-400 hover:text-blue-600 font-semibold underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* SERVICES TABLE */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500 mb-4">
            {category || status || filter ? 'No services match these filters' : 'No services found'}
          </p>
          {category || status ? (
            <button
              onClick={() => { setCategory(''); setStatus(''); }}
              className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-200 mr-2"
            >
              Clear filters
            </button>
          ) : null}
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
              {filteredServices.map((service) => (
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
                  <td className="px-6 py-4 text-gray-600 capitalize">
                    {(() => {
                      const cities = getServiceCities(service);
                      return cities.length === 4 ? 'All Locations' : cities.length > 1 ? `${cities.length} cities` : cities[0] || '—';
                    })()}
                  </td>
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
