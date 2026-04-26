export default function Sidebar({ step }: any) {
  return (
    <div className="space-y-10">

      <div>
        <h1 className="text-4xl font-extrabold text-[#0B2545]">
          Reserve Your Clinical Consultation
        </h1>
        <p className="text-gray-500 mt-3">
          Secure your spot in our clinical sanctuary.
        </p>
      </div>

      <div className="space-y-6">
        <Step title="Personal Info" active={step === 1} />
        <Step title="Service Selection" active={step === 2} />
        <Step title="Clinic Location" active={step === 3} />
        <Step title="Schedule" active={step === 4} />
      </div>

      <div className="bg-[#EEF2F7] p-5 rounded-xl">
        <p className="font-semibold text-sm">Secure & Private</p>
        <p className="text-xs text-gray-500">
          Your information is encrypted and secure.
        </p>
      </div>
    </div>
  );
}

function Step({ title, active }: any) {
  return (
    <div className="flex items-center gap-4">

      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        active ? "bg-[#0B2545] text-white" : "bg-gray-200"
      }`}>
        ●
      </div>

      <p className={active ? "text-[#0B2545] font-semibold" : "text-gray-400"}>
        {title}
      </p>

    </div>
  );
}