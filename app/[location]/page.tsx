import Hero from "../components/Hero";
import Services from "../components/Services";
import Results from "../components/Results";
import Expertise from "../components/Expertise";
import CTA from "../components/CTA";
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
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid md:grid-cols-2 gap-10 items-center">

        {/* LEFT INFO */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-primary">
            Visit Our {cityData?.name} Clinic
          </h2>

          <p className="text-gray-600">{cityData?.address}</p>

          <a
            href={`tel:${cityData?.phone}`}
            className="text-secondary font-semibold"
          >
            📞 {cityData?.phone}
          </a>
        </div>

        {/* RIGHT MAP */}
        <div className="rounded-2xl overflow-hidden shadow-lg">
          {cityData?.map && (
            <iframe
              src={cityData.map}
              className="w-full h-[300px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          )}
        </div>

      </section>

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