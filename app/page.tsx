import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Results from "./components/Results";
import Expertise from "./components/Expertise";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import LocationsSection from "./components/LocationsSection";
import TestimonialsSection from "./components/TestimonialsSection";
import ConsultationCTA from "./components/ConsultationCTA";




export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <Results />
      <LocationsSection showAll/>
      <Expertise />
      <TestimonialsSection />
      <ConsultationCTA/>
      <Footer />
    </main>
  );
}