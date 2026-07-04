export default function Loading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-[#0B2560] to-[#1a3a7a] h-[60vh] w-full" />

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-10">
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-3xl h-48" />
          ))}
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-36" />
          ))}
        </div>
      </div>
    </div>
  );
}
