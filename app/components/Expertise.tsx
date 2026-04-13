import Image from "next/image";
import { FlaskConical, ShieldCheck, UserCheck } from "lucide-react";

export default function Expertise() {
  return (
    <section id="expertise" className="py-24 px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-20 items-center">
        <div className="w-full md:w-1/2 relative">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>
          <div className="relative rounded-[48px] overflow-hidden border-8 border-gray-100 shadow-2xl">
            <Image
              className="w-full aspect-[4/5] object-cover"
              alt="a high-tech modern medical laboratory with stainless steel surfaces and blue neon accents representing precision medical technology"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUMdvd3b0t9Ii3rBNNCPCWhfUs5tP2lBa58tbeDdL9jbVbPbmLFXSupBsvB7G9nFdnFkSuSlCQZK8J0iaF4IzgrF0Ln5Ko7u6txUpB9rt293mbxIcY7jJ5nnhRvhoj772UWAeJoSKe2_f2K4hqyU2eruva87TZx_vfgmi0cm0IkU6KXQ2JHndyM4rG3bQDbcx0qUX9y6w55w4n8XHioFpNyJrSQ-Gb4oc6YopV6vdgMHPlw5g3GiDcd2pw_r5K36TJhofAGXaerN4"
              width={320}
              height={400}

              priority
            />
          </div>
          <div className="absolute bottom-10 -right-8 bg-primary p-8 rounded-3xl text-white shadow-2xl max-w-[240px]">
            <span className="text-5xl font-extrabold font-headline block mb-2">20+</span>
            <span className="text-sm font-medium opacity-80 uppercase tracking-widest">Years of Combined Expertise</span>
          </div>
        </div>
        <div className="w-full md:w-1/2 space-y-8">
          <h2 className="text-4xl md:text-5xl font-extrabold font-headline text-primary leading-tight">Expertise You <br /> Can Trust</h2>
          <p className="text-gray-700 font-semibold text-lg leading-relaxed">Our clinic is led by world-class dermatologists committed to the science of beauty. We don't just treat symptoms; we understand the biological foundation of your skin and hair health.</p>
          <div className="space-y-6">
            <div className="flex items-start gap-4 hover:translate-x-1 transition">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <FlaskConical className="text-secondary" size={22} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-1">Evidence-Based Protocols</h4>
                <p className="text-gray-700 font-semibold">Every treatment is backed by clinical research and proven medical outcomes.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 hover:translate-x-1 transition">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <ShieldCheck className="text-secondary" size={22} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-1">FDA Approved Technology</h4>
                <p className="text-gray-700 font-semibold">We invest in only the safest, most advanced medical aesthetic devices available globally.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 hover:translate-x-1 transition">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <UserCheck className="text-secondary" size={22} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-1">Personalized Care Path</h4>
                <p className="text-gray-700 font-semibold">No two patients are alike. We curate a bespoke journey for your specific aesthetic goals.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}