import TestimonialsSlider from '@/app/components/homepage/TestimonialsSlider';

// Reuses the same patient testimonials already configured for the homepage
// (Admin → Homepage → Testimonials) rather than duplicating a second data source.
export default function ReviewsSection({ data }: { data: any }) {
  return <TestimonialsSlider data={data} />;
}
