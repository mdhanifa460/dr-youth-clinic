"use client";

import { useEffect, useMemo, useState } from "react";

export default function BookingsPage() {
  const [all, setAll] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");

  const [page, setPage] = useState(1);
  const perPage = 6;

  const [selected, setSelected] = useState<any>(null);
const [form, setForm] = useState<any>({});

  // 🔄 AUTO REFRESH (REAL-TIME)
  useEffect(() => {
    const fetchData = () => {
      fetch("/api/admin/bookings")
        .then(res => res.json())
        .then(setAll);
    };

    fetchData();

    const interval = setInterval(fetchData, 5000); // every 5 sec
    return () => clearInterval(interval);
  }, []);

  // 🔍 FILTER LOGIC
  const filtered = useMemo(() => {
    return all.filter(b => {
      const matchQ =
        !q ||
        b.name?.toLowerCase().includes(q.toLowerCase()) ||
        b.phone?.includes(q);

      const matchService = !service || b.service === service;
      const matchLocation = !location || b.location === location;
      const matchStatus = !status || (b.status || "new") === status;
      const matchDate = !date || b.date === date;

      return matchQ && matchService && matchLocation && matchStatus && matchDate;
    });
  }, [all, q, service, location, status, date]);

  // 🔄 RESET PAGE WHEN FILTER CHANGES
  useEffect(() => {
    setPage(1);
  }, [q, service, location, status, date]);

  // 📄 PAGINATION
  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (page - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  // 🔄 UPDATE STATUS
  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/admin/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, status }),
    });

    setAll(prev =>
      prev.map(b => (b._id === id ? { ...b, status } : b))
    );
  };

  // 📤 EXPORT CSV
  const exportCSV = () => {
    const rows = [
      ["Name", "Phone", "Service", "Location", "Date", "Time", "Status"],
      ...filtered.map(b => [
        b.name,
        b.phone,
        b.service,
        b.location,
        b.date,
        b.time,
        b.status || "new",
      ]),
    ];

    const csv =
      "data:text/csv;charset=utf-8," +
      rows.map(e => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "bookings.csv";
    link.click();
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bookings</h1>

        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Export CSV
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow grid md:grid-cols-5 gap-3">
        <input
          placeholder="Search name / phone"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <select
          aria-label="Filter by service"
          value={service}
          onChange={e => setService(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Services</option>
          <option>Skin</option>
          <option>Hair</option>
          <option>Laser</option>
        </select>

        <select
          aria-label="Filter by location"
          value={location}
          onChange={e => setLocation(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Locations</option>
          <option>Chennai</option>
          <option>Bangalore</option>
          <option>Kochi</option>
        </select>

        <select
          aria-label="Filter by status"
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="confirmed">Confirmed</option>
          <option value="done">Done</option>
        </select>

        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border px-3 py-2 rounded"
          placeholder="Select date"
        />
      </div>

      {/* RESULT COUNT */}
      <p className="text-sm text-gray-500">
        Showing {paginated.length} of {filtered.length}
      </p>

      {/* CARDS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginated.map(b => (
          <div
            key={b._id}
            className={`bg-white rounded-xl shadow p-5 space-y-2 border ${
              (b.status || "new") === "new"
                ? "border-green-500 shadow-lg"
                : "border-gray-200"
            }`}
          >
            <div className="flex justify-between">
              <h2 className="font-bold">{b.name}</h2>

              {(b.status || "new") === "new" && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  NEW
                </span>
              )}
            </div>

            <p className="text-sm">📞 {b.phone}</p>
            <p className="text-sm">💼 {b.service}</p>
            <p className="text-sm">📍 {b.location}</p>
            <p className="text-sm">📅 {b.date} ⏰ {b.time}</p>

            <select
              aria-label="Update booking status"
              value={b.status || "new"}
              onChange={e => updateStatus(b._id, e.target.value)}
              className="border px-3 py-2 rounded w-full"
            >
              <option value="new">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="done">Done</option>
            </select>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex gap-2 mt-6 flex-wrap">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`px-3 py-1 rounded ${
              page === i + 1
                ? "bg-black text-white"
                : "bg-gray-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}