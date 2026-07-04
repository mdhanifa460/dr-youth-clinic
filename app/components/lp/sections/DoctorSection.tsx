'use client';

interface DoctorData {
  photo?: string;
  name?: string;
  qualification?: string;
  experience?: string;
  bio?: string;
  specialties?: string[];
}

export default function DoctorSection({ data }: { data: DoctorData }) {
  const {
    photo,
    name = 'Dr. Expert',
    qualification = 'MBBS, MD Dermatology',
    experience = '15 Years',
    bio = 'Expert dermatologist specialising in skin and hair treatments.',
    specialties = [],
  } = data;

  const credentials = qualification.split(',').map((q) => q.trim()).filter(Boolean);

  return (
    <section className="bg-[#0B2560] py-14 md:py-24 relative overflow-hidden">
      {/* Subtle gradient accents */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 20% 50%, #F5A623 0, transparent 45%), radial-gradient(ellipse at 80% 50%, #3B82C4 0, transparent 45%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Your Doctor</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white">Expert Care, Personal Attention</h2>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 md:p-10">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            {/* Photo + credentials */}
            <div className="shrink-0 flex flex-col items-center gap-5">
              <div className="relative">
                {photo ? (
                  <div className="w-44 h-44 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-[#F5A623] shadow-2xl shadow-[#F5A623]/20">
                    <img src={photo} alt={name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-44 h-44 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-[#3B82C4] to-[#0B2560] flex items-center justify-center border-4 border-[#F5A623] shadow-2xl shadow-[#F5A623]/20">
                    <span className="text-7xl">👨‍⚕️</span>
                  </div>
                )}
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full border-2 border-[#F5A623]/40 scale-110 pointer-events-none" />
              </div>

              {/* Credential badge chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-[240px]">
                {credentials.map((cred, i) => (
                  <span
                    key={i}
                    className="bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#F5A623] text-xs font-bold px-3 py-1 rounded-full"
                  >
                    {cred}
                  </span>
                ))}
                <span className="bg-white/15 border border-white/30 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {experience} Exp.
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl md:text-4xl font-extrabold text-white">{name}</h3>
              <p className="text-[#F5A623] font-semibold mt-1 text-sm md:text-base">{qualification}</p>

              {/* Achievement tiles */}
              <div className="flex flex-wrap gap-3 mt-5 justify-center md:justify-start">
                {[
                  { val: '500+', lbl: 'Procedures' },
                  { val: '4.9★', lbl: 'Patient Rating' },
                  { val: '✦ Published', lbl: 'Researcher' },
                ].map(({ val, lbl }) => (
                  <div key={lbl} className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-center min-w-[80px]">
                    <p className="text-white font-extrabold text-sm">{val}</p>
                    <p className="text-white/55 text-[10px] mt-0.5">{lbl}</p>
                  </div>
                ))}
              </div>

              {/* Bio */}
              <p className="text-white/70 mt-5 text-sm md:text-base leading-relaxed">{bio}</p>

              {/* Pull quote */}
              <div className="mt-5 border-l-4 border-[#F5A623] pl-4">
                <p className="text-white/80 italic text-sm leading-relaxed">
                  &ldquo;Every patient deserves to feel confident in their own skin. That&rsquo;s why I practice.&rdquo;
                </p>
                <p className="text-[#F5A623] text-xs font-bold mt-1.5">— {name}</p>
              </div>

              {/* Specialties */}
              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-5 justify-center md:justify-start">
                  {specialties.map((s, i) => (
                    <span
                      key={i}
                      className="bg-white/10 border border-white/20 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-xl"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => document.getElementById('lp-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-6 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-7 py-3.5 rounded-2xl text-sm shadow-xl shadow-[#F5A623]/20 hover:-translate-y-0.5 transition-all duration-200"
              >
                Book with {name.split(' ').slice(0, 2).join(' ')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
