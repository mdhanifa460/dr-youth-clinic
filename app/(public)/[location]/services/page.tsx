import { Service } from '@/app/models/Service';
import { connectDB } from '@/app/lib/mongodb';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dryouthclinic.co.in';

interface PageProps {
  params: { location: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const cityName =
    params.location.charAt(0).toUpperCase() + params.location.slice(1);

  return {
    title: `Services in ${cityName} | DR Youth Clinic`,
    description: `Explore our premium dermatology, skin, hair, and laser treatments in ${cityName}. Book your consultation today.`,
    alternates: {
      canonical: `${SITE_URL}/${params.location}/services`,
    },
    openGraph: {
      title: `Dermatology Services in ${cityName}`,
      description: `Advanced skin, hair, and laser treatments`,
      url: `${SITE_URL}/${params.location}/services`,
    },
  };
}

async function getServices(location: string) {
  try {
    await connectDB();
    const services = await Service.find({
      location: location.toLowerCase(),
      status: 'active',
    }).sort({ createdAt: -1 });
    return services;
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
}

export default async function ServicesPage({ params }: PageProps) {
  const services = await getServices(params.location);
  const cityName =
    params.location.charAt(0).toUpperCase() + params.location.slice(1);

  const categorized = {
    Skin: services.filter((s) => s.category === 'Skin'),
    Hair: services.filter((s) => s.category === 'Hair'),
    Laser: services.filter((s) => s.category === 'Laser'),
  };

  return (
    <main className="bg-white">
      {/* HERO SECTION */}
      <section className="relative py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Our Services in {cityName}
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl">
            Discover our comprehensive range of dermatological, hair, and laser
            treatments designed to enhance your natural beauty.
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        {services.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No services available yet. Check back soon!
            </p>
          </div>
        ) : (
          <>
            {/* SKIN SERVICES */}
            {categorized.Skin.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  💆 Skin & Aesthetic Treatments
                </h2>
                <p className="text-gray-600 mb-8">
                  Rejuvenate your skin with our advanced dermatological solutions
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorized.Skin.map((service) => (
                    <ServiceCard key={service._id} service={service} />
                  ))}
                </div>
              </div>
            )}

            {/* HAIR SERVICES */}
            {categorized.Hair.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  💇 Hair Treatment Solutions
                </h2>
                <p className="text-gray-600 mb-8">
                  Restore and revitalize your hair with expert care
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorized.Hair.map((service) => (
                    <ServiceCard key={service._id} service={service} />
                  ))}
                </div>
              </div>
            )}

            {/* LASER SERVICES */}
            {categorized.Laser.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  ⚡ Advanced Laser Treatments
                </h2>
                <p className="text-gray-600 mb-8">
                  Cutting-edge laser technology for superior results
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorized.Laser.map((service) => (
                    <ServiceCard key={service._id} service={service} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform?</h2>
          <p className="text-lg text-blue-100 mb-8">
            Schedule your consultation with our expert dermatologists today
          </p>
          <Link href="/book">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold hover:bg-blue-50 transition">
              Book Appointment
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}

function ServiceCard({ service }: { service: any }) {
  return (
    <div className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300">
      {/* IMAGE */}
      {service.heroImage?.url && (
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          <Image
            src={service.heroImage.url}
            alt={service.name}
            fill
            className="object-cover group-hover:scale-110 transition duration-300"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition" />
        </div>
      )}

      {/* CONTENT */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{service.name}</h3>

        {/* BENEFITS */}
        {service.benefits && service.benefits.length > 0 && (
          <ul className="mb-4 space-y-2">
            {service.benefits.slice(0, 2).map((benefit: any, idx: number) => (
              <li key={idx} className="flex gap-2 text-sm text-gray-600">
                <span className="text-lg">{benefit.icon}</span>
                <span>{benefit.title}</span>
              </li>
            ))}
          </ul>
        )}

        {/* PRICING */}
        <div className="flex justify-between items-center mb-4 py-4 border-t">
          <span className="font-bold text-2xl text-blue-600">
            {service.currency} {service.price}
          </span>
          <span className="text-sm text-gray-500">
            {service.duration} mins
          </span>
        </div>

        {/* CTA */}
        <Link href="/book">
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Learn More
          </button>
        </Link>
      </div>
    </div>
  );
}
