"use client";

import { useEffect, useState } from "react";

type BookingStatus = "new" | "confirmed" | "done";

type Booking = {
  _id: string;
  name?: string;
  phone?: string;
  service?: string;
  location?: string;
  date?: string;
  time?: string;
  status?: BookingStatus;
};

const getErrorMessage = (fallback: string, body: unknown) => {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
};

const escapeCSVCell = (value: unknown) => {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;

  return /[",\n\r]/.test(safeText)
    ? `"${safeText.replace(/"/g, '""')}"`
    : safeText;
};

export default function BookingsPage() {
  const [all, setAll] = useState<Booking[]>([]);
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 🔄 FETCH DATA
  const fetchData = async () => {
    try {
      const res = await fetch(
        `/api/admin/bookings?page=${page}&limit=6&status=${status}&search=${q}&date=${date}&service=${service}&location=${location}`
      );

      const body = await res.json();

      if (!res.ok) {
        throw new Error(getErrorMessage("Could not load bookings", body));
      }

      setAll(Array.isArray(body.data) ? body.data : []);
      setTotalPages(body.totalPages || 1);
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not load bookings");
    }
  };

  // 🔄 AUTO REFRESH
  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 60000);

    return () => clearInterval(interval);
  }, [page, status, q, date, service, location]);

  // 🔄 RESET PAGE WHEN FILTER CHANGES
  useEffect(() => {
    setPage(1);
  }, [q, service, location, status, date]);

  // 🔄 UPDATE STATUS
  const updateStatus = async (id: string, nextStatus: BookingStatus) => {
    const res = await fetch("/api/admin/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, status: nextStatus }),
    });

    const body = await res.json();

    if (!res.ok) {
      setError(getErrorMessage("Could not update status", body));
      return;
    }

    setAll(prev =>
      prev.map(b => (b._id === id ? { ...b, status: nextStatus } : b))
    );
    setError("");
  };

  // 📤 EXPORT CSV
  const exportCSV = () => {
    const rows = [
      ["Name", "Phone", "Service", "Location", "Date", "Time", "Status"],
      ...all.map(b => [
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
      rows.map(e => e.map(escapeCSVCell).join(",")).join("\n");

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

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

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
          title="Select date"
          placeholder="Select date"
        />
      </div>

      {/* RESULT COUNT */}
      <p className="text-sm text-gray-500">
        Showing {all.length} records
      </p>

      {/* CARDS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {all.map(b => (
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
              aria-label="Booking status"
              title="Booking status"
              value={b.status || "new"}
              onChange={e =>
                updateStatus(b._id, e.target.value as BookingStatus)
              }
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