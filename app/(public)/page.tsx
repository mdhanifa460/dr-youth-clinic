
import Hero from "@/app/components/Hero";
import Services from "@/app/components/Services";
import Results from "@/app/components/Results";
import Expertise from "@/app/components/Expertise";
import LocationsSection from "@/app/components/LocationsSection";
import TestimonialsSection from "@/app/components/TestimonialsSection";
import ConsultationCTA from "@/app/components/ConsultationCTA";




export default function Home() {
  return (
    <main>
    
      <Hero />
      <Services />
      <Results />
      <LocationsSection showAll/>
      <Expertise />
      <TestimonialsSection />
      <ConsultationCTA/>
      
    </main>
  );
}