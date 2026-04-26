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
  concern?: string;
  status?: BookingStatus;
};

const statuses: BookingStatus[] = ["new", "confirmed", "done"];

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

  const [selected, setSelected] = useState<Booking | null>(null);
  const [form, setForm] = useState<Booking>({ _id: "" });

  // 🔄 FETCH DATA (updated)
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

  // 🔄 RESET PAGE ON FILTER CHANGE
  useEffect(() => {
    setPage(1);
  }, [q, service, location, status, date]);

  // 🔄 STATUS UPDATE
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
  };

  // 📤 EXPORT CSV (uses current page data)
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
      rows.map(r => r.map(escapeCSVCell).join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "bookings.csv";
    link.click();
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between">
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

      {/* FILTER */}
      <div className="bg-white p-4 rounded-xl shadow grid md:grid-cols-5 gap-3">
        <input
          placeholder="Search"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <select aria-label="Service" value={service} onChange={e => setService(e.target.value)} className="border px-3 py-2 rounded">
          <option value="">Service</option>
          <option>Skin</option>
          <option>Hair</option>
        </select>

        <select aria-label="Location" value={location} onChange={e => setLocation(e.target.value)} className="border px-3 py-2 rounded">
          <option value="">Location</option>
          <option>Chennai</option>
        </select>

        <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)} className="border px-3 py-2 rounded">
          <option value="">Status</option>
          <option value="new">New</option>
          <option value="confirmed">Confirmed</option>
          <option value="done">Done</option>
        </select>

        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border px-3 py-2 rounded"
        />
      </div>

      {/* COUNT */}
      <p className="text-sm text-gray-500">
        Showing {all.length} records
      </p>

      {/* CARDS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {all.map(b => (
          <div
            key={b._id}
            onClick={() => {
              setSelected(b);
              setForm({ ...b });
            }}
            className="bg-white rounded-xl shadow p-5 cursor-pointer"
          >
            <h2 className="font-bold">{b.name}</h2>
            <p>{b.phone}</p>
            <p>{b.service}</p>
            <p>{b.date}</p>

            <select
              aria-label="Update status"
              value={b.status || "new"}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                updateStatus(b._id, e.target.value as BookingStatus)
              }
              className="border mt-2 w-full"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex gap-2">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`px-3 py-1 ${
              page === i + 1 ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-[400px] space-y-3">

            <h2 className="font-bold text-lg">Edit Booking</h2>

            <input  value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} className="border w-full p-2" />
            <input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} className="border w-full p-2" />
            <input value={form.service || ""} onChange={e => setForm({ ...form, service: e.target.value })} className="border w-full p-2" />
            <input value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} className="border w-full p-2" />

            <input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })} className="border w-full p-2" />
            <input type="time" value={form.time || ""} onChange={e => setForm({ ...form, time: e.target.value })} className="border w-full p-2" />

            <select value={form.status || "new"} onChange={e => setForm({ ...form, status: e.target.value as BookingStatus })} className="border w-full p-2">
              {statuses.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <div className="flex justify-between">
              <button onClick={() => setSelected(null)} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>

              <button
                onClick={async () => {
                  const res = await fetch("/api/admin/update-booking", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                  });

                  const body = await res.json();

                  if (!res.ok) {
                    setError(getErrorMessage("Could not save booking", body));
                    return;
                  }

                  setAll(prev =>
                    prev.map(b =>
                      b._id === form._id ? body.booking : b
                    )
                  );

                  setSelected(null);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}