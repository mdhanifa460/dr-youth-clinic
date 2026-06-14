import Hero from "@/app/components/Hero";
import Services from "@/app/components/Services";
import Results from "@/app/components/Results";
import Expertise from "@/app/components/Expertise";
import CTA from "@/app/components/CTA";
import LocationsSection from "@/app/components/LocationsSection";
import { locations, LocationType } from "@/app/data/locations";
import { LocalBusinessSchema } from "@/app/components/SchemaMarkup";
import { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dryouthclinic.co.in";

export async function generateStaticParams() {
  return Object.keys(locations).map((location) => ({
    location,
  }));
}

export async function generateMetadata({ params }: { params: { location: string } }): Promise<Metadata> {
  const city = params.location;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  const locationData = locations[city];

  return {
    title: `Best Dermatology & Skin Clinic in ${cityName} | DR Youth Clinic`,
    description: `Premium skin, hair, and laser treatments in ${cityName}. Expert dermatologists offering advanced aesthetic solutions. Book your free consultation today.`,
    alternates: {
      canonical: `${SITE_URL}/${city}`,
    },
    openGraph: {
      title: `Best Skin Clinic in ${cityName} | DR Youth Clinic`,
      description: `Advanced dermatology treatments in ${cityName}`,
      url: `${SITE_URL}/${city}`,
      siteName: "DR Youth Clinic",
      type: "website",
      locale: "en_IN",
    },
  };
}

export default function LocationPage({ params }: { params: { location: string } }) {
  const city = params.location;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  return (
    <>
      <LocalBusinessSchema location={city} city={cityName} />
      <main>
        <Hero city={cityName} />
        <LocationsSection activeCity={params.location} />
        <Services city={cityName} />
        <Results city={cityName} />
        <Expertise city={cityName} />
        <CTA city={cityName} />
      </main>
    </>
  );
}