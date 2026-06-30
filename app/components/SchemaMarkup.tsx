import { locations } from "@/app/data/locations";
import { CLOUDINARY_LOGO_URL } from "@/app/lib/legacyImageUrls";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "DR Youth Clinic",
    url: SITE_URL,
    logo: CLOUDINARY_LOGO_URL,
    description: "Premium dermatology and aesthetic treatment clinic",
    sameAs: [
      "https://www.facebook.com/dryouthclinic",
      "https://www.instagram.com/dryouthclinic",
      "https://www.youtube.com/@dryouthclinic",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      telephone: "+91-9876543210",
    },
    areaServed: Object.values(locations).map((loc) => ({
      "@type": "City",
      name: loc.name,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface LocalBusinessProps {
  location: string;
  city: string;
  // DB-sourced overrides — fall back to locations.ts if omitted
  address?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
}

export function LocalBusinessSchema({ location, city, address, phone, rating, reviewCount }: LocalBusinessProps) {
  const locationData = locations[location];
  if (!locationData) return null;

  const effectiveAddress  = address      || locationData.address;
  const effectivePhone    = phone        || locationData.phone;
  const effectiveRating   = rating       ?? locationData.rating;
  const effectiveReviews  = reviewCount  ?? locationData.reviewCount;

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: `DR Youth Clinic - ${city}`,
    url: `${SITE_URL}/${location}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: effectiveAddress,
      addressLocality: city,
      addressRegion: city,
      addressCountry: "IN",
    },
    telephone: effectivePhone,
    image: CLOUDINARY_LOGO_URL,
    description: `Premium dermatology clinic in ${city} offering advanced skin, hair, and laser treatments`,
    priceRange: "$$",
    medicalSpecialty: ["Dermatology", "Cosmetology", "Laser Surgery"],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "19:00",
      },
    ],
  };

  // AggregateRating unlocks star display in Google search results
  if (effectiveRating > 0 && effectiveReviews > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: effectiveRating.toFixed(1),
      reviewCount: effectiveReviews,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What treatments does DR Youth Clinic offer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We offer dermatology, hair treatments, laser treatments, and aesthetic procedures performed by expert dermatologists.",
        },
      },
      {
        "@type": "Question",
        name: "How can I book a consultation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can book online through our website, call us directly, or visit our clinic in person.",
        },
      },
      {
        "@type": "Question",
        name: "Are results guaranteed?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Results vary by individual and treatment. Our doctors will discuss expected outcomes during your consultation.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
