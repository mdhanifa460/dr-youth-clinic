import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Results from "./components/Results";
import Expertise from "./components/Expertise";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <Results />
      <Expertise />
      <CTA />
      <Footer />
    </main>
  );
}