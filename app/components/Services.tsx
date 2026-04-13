import Image from "next/image";
import { Stethoscope } from "lucide-react";

export default function Services({ city = "" }: { city?: string }) {
  return (
    <section id="services" className="py-24 px-6 md:px-10 bg-background">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-primary mb-6">
              Clinical-Level Beauty Services
            </h2>

            <p className="text-gray-700 text-lg leading-relaxed font-semibold">
              Experience medical precision meets aesthetic artistry across our core specializations.
            </p>
          </div>

          <a className="text-secondary font-semibold flex items-center gap-2 hover:gap-3 transition-all" href="#">
            Explore All Services →
          </a>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* BIG CARD */}
          <div className="md:col-span-2 group relative overflow-hidden rounded-[28px] min-h-[400px]">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0J9Ya0-yrU7XMZJ6gkmRFnk-chSXBGO1O3b6GIPaB6MBEpIxrQInhx19F3Aq_SciNAfwDG9wAVn-kNOn6YKojOlP8AW0BbsPW5MkEje_ia6elgSU-RClW4LaZW8YK37KGU_aPn_Id_zpfjmkwPOAW9l7uq-71QRBewnDumLzK7BTGCnN709Vo5o2DLwJzLvmL8-EXQjxYaA64X0SYDvHgwZRGglGrojQYPgh7ewIXZ5ppMM16TQSPVIVJ7CC6FteXvV1sw_8jdAQ"
              alt="Skin Care"
              fill
              className="object-cover group-hover:scale-110 transition duration-700"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent p-10 flex flex-col justify-end">
              <span className="bg-white/20 backdrop-blur text-white px-4 py-1 rounded-full text-xs font-semibold mb-3 w-fit">
                DERMATOLOGY
              </span>

              <h3 className="text-3xl font-headline font-extrabold text-white mb-2">
                Advanced Skin Care
              </h3>

              <p className="text-white/80 max-w-md">
                Targeted solutions for acne, anti-aging, and complex dermatological conditions.
              </p>
            </div>
          </div>

          {/* SMALL CARDS */}
          {[
            {
              title: "Hair Restoration",
              tag: "TRICHOLOGY",
              img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCveWEAqcV6z0Ib7K46JrmuEdKLCCM47n-vlXcz3Qz4uOgaxTd7dckOgxtiBm8e_litBpivBieASZZ0CKwHxqvy1FzIvi2cpVldn-3RSaBGUt-dcVaQb__qXPNYJ62kXR1VfPrmdypoO1o06u92YT7xX_bSM8Vxl7DRDiNsJa9Ijw-mPNgtPRUSEn1gabpfFhf9Jb5fkw6ZJD3CK0Pjp4_ynP5us0L35AXIa0ne60WzfGF3wWddQs26B9B7zPOOMjhse6fWvpwbDU0",
            },
            {
              title: "Laser Technology",
              tag: "PRECISION",
              img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCt4VSetce9ep7jIkVNcOOwT45noJqwRuzz06ONRH7OSQbA8k99kMDxKOo4CV9dWqMnxGkOu3t9SxV8CSFB_NiJ2HBgC-wKH_mXu8Pe5sqiNRBopkHmSfQp7qcvh8z8_95rMLw7SU1JZtu_OaNyFxwEa-RmdiRZu56Q_e548fAY7MMxdtHnsiLQTvenwt1vDGgWTrpbefNp7RXXPnjPuh01cYsThcD3IbckMTtxFeA59ZasdXO-9fcAHYagnU7ImMGCR3sdvSFPAb4",
            },
          ].map((item, i) => (
            <div key={i} className="group relative overflow-hidden rounded-[28px] min-h-[400px]">
              <Image
                src={item.img}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-110 transition duration-700"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent p-8 flex flex-col justify-end">
                <span className="bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-semibold mb-3 w-fit">
                  {item.tag}
                </span>

                <h3 className="text-2xl font-headline font-extrabold text-white mb-2">
                  {item.title}
                </h3>

                <p className="text-white/80 text-sm leading-relaxed">
                  {item.title === "Hair Restoration"
                    ? "PRP therapy and advanced treatments to restore hair density and scalp health."
                    : "Safe and effective laser solutions for hair removal and pigmentation correction."}
                </p>
              </div>
            </div>
          ))}

          {/* CONSULT CARD */}
          <div className="md:col-span-2 bg-white rounded-[28px] p-12 text-center shadow-lg">

            {/* ICON */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Stethoscope className="text-white" size={28} />
            </div>

            <h3 className="text-3xl font-headline font-extrabold text-primary mb-4">
              Need a personalized diagnosis?
            </h3>

            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Our expert dermatologists are ready to analyze your unique needs and create a custom treatment path.
            </p>

            <button className="bg-primary text-white px-8 py-3 rounded-xl font-semibold">
              Schedule Consultation
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}