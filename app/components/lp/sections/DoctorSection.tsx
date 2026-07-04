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

  return (
    <section className="bg-[#0B2560] py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">
            Your Doctor
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white">Expert Care, Personal Attention</h2>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 md:p-10">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Photo */}
            <div className="shrink-0">
              {photo ? (
                <div className="w-32 h-32 md:w-44 md:h-44 rounded-3xl overflow-hidden shadow-2xl border-4 border-[#F5A623]/30">
                  <img src={photo} alt={name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 md:w-44 md:h-44 rounded-3xl bg-gradient-to-br from-[#3B82C4] to-[#0B2560] flex items-center justify-center shadow-2xl border-4 border-[#F5A623]/30">
                  <span className="text-6xl">👨‍⚕️</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl md:text-3xl font-extrabold text-white">{name}</h3>
              <p className="text-[#F5A623] font-semibold mt-1 text-sm md:text-base">{qualification}</p>

              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                  🏆 {experience} Experience
                </span>
                {specialties.slice(0, 3).map((s, i) => (
                  <span key={i} className="bg-white/10 border border-white/20 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-xl">
                    {s}
                  </span>
                ))}
              </div>

              <p className="text-white/70 mt-4 text-sm md:text-base leading-relaxed">{bio}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
