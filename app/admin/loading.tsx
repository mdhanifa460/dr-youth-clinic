export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#f6faff] animate-pulse">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-xl" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-32" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 h-64" />
        <div className="bg-white rounded-2xl border border-gray-100 h-48" />
      </div>
    </div>
  );
}
