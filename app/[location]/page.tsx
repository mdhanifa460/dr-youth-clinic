import Hero from "../components/Hero";
import Services from "../components/Services";
import Results from "../components/Results";
import Expertise from "../components/Expertise";
import CTA from "../components/CTA";
import LocationsSection from "../components/LocationsSection";
import { locations, LocationType } from "../data/locations";


export async function generateMetadata({ params }: any) {
  const city = params.location;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);


  return {
    title: `Best Skin Clinic in ${cityName} | DR Youth Clinic`,
    description: `Top dermatology clinic in ${cityName} offering advanced skin, hair, and laser treatments. Book your consultation today.`,
    keywords: [
      `skin clinic in ${cityName}`,
      `dermatologist in ${cityName}`,
      `hair treatment ${cityName}`,
      `laser clinic ${cityName}`,
    ],
    openGraph: {
      title: `Best Skin Clinic in ${cityName}`,
      description: `Advanced dermatology treatments in ${cityName}`,
      url: `https://dr-youth-clinic.vercel.app/${city}`,
      siteName: "DR Youth Clinic",
      type: "website",
    },
  };
}

export default function LocationPage({ params }: any) {
  const city = params.location;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  const cityData: LocationType | undefined = locations[params.location];

  return (
    <main>

      {/* HERO */}
      <Hero city={cityName} />

      {/* LOCATION INFO */}
       <LocationsSection activeCity={params.location} />

      {/* SERVICES */}
      <Services city={cityName} />

      {/* RESULTS */}
      <Results city={cityName} />

      {/* EXPERTISE */}
      <Expertise city={cityName} />

      {/* CTA */}
      <CTA city={cityName} />

    </main>
  );

}