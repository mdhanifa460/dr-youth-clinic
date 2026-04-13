export default function LocationPage({ params }: any) {
 const city = params.location;
const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  return (
    <main className="min-h-screen">

      {/* HERO */}
      <section className="py-24 text-center bg-surface-soft">
        <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-primary">
          Best Skin Clinic in {cityName}
        </h1>

        <p className="mt-4 text-gray-700 max-w-2xl mx-auto">
          Advanced dermatology treatments in {city} for skin, hair, and laser care.
        </p>
      </section>

    </main>
  );
}