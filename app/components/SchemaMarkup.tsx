import { locations } from "@/app/data/locations";
import { CLOUDINARY_LOGO_URL } from "@/app/lib/legacyImageUrls";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export function OrganizationSchema({ phone, instagramUrl, facebookUrl, youtubeUrl }: {
  phone?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
}) {
  const sameAs = [
    facebookUrl  || "https://www.facebook.com/dryouthclinic",
    instagramUrl || "https://www.instagram.com/dryouthclinic",
    youtubeUrl   || "https://www.youtube.com/@dryouthclinic",
  ].filter(Boolean);

  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "DR Youth Clinic",
    url: SITE_URL,
    logo: CLOUDINARY_LOGO_URL,
    description: "Premium dermatology and aesthetic treatment clinic",
    sameAs,
    ...(phone ? {
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Customer Service",
        telephone: phone,
      },
    } : {}),
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

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSchema({ faqs }: { faqs: FAQItem[] }) {
  if (!faqs || faqs.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  // Absolute URL. Pass SITE_URL-prefixed paths, matching the existing inline
  // convention in app/(public)/[location]/services/[category]/[slug]/page.tsx.
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BlogPostingProps {
  title: string;
  description: string;
  slug: string;
  image?: string;
  authorName: string;
  // Only set when the post has a real Doctor reviewer — otherwise the
  // author renders as a Person with just a name, no medical credentials.
  authorCredential?: string;
  datePublished: string;
  dateModified?: string;
}

export function BlogPostingSchema({ title, description, slug, image, authorName, authorCredential, datePublished, dateModified }: BlogPostingProps) {
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    image: image || CLOUDINARY_LOGO_URL,
    author: {
      "@type": "Person",
      name: authorName,
      ...(authorCredential ? { honorificSuffix: authorCredential } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: "DR Youth Clinic",
      logo: { "@type": "ImageObject", url: CLOUDINARY_LOGO_URL },
    },
    datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${slug}` },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
