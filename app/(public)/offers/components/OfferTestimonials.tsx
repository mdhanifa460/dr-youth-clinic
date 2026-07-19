import TestimonialsSlider from '@/app/components/homepage/TestimonialsSlider';

// Thin wrapper — reuses the existing homepage review carousel directly
// rather than rebuilding one. Self-fetches real reviews client-side.
export default function OfferTestimonials() {
  return (
    <section className="bg-[#f6faff] py-14">
      <TestimonialsSlider
        data={{
          headline: 'Loved by Our Patients',
          subheadline: 'Real stories from people who booked through our offers.',
          displayCount: 6,
        }}
      />
    </section>
  );
}
