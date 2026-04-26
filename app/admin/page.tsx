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

  // 🔄 AUTO REFRESH
  useEffect(() => {
    const fetchData = () => {
      fetch("/api/admin/bookings")
        .then(res => res.json())
        .then(setAll);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  // 🔍 FILTER
  const filtered = useMemo(() => {
    return all.filter(b => {
      const matchQ =
        !q ||
        b.name?.toLowerCase().includes(q.toLowerCase()) ||
        b.phone?.includes(q);

      return (
        matchQ &&
        (!service || b.service === service) &&
        (!location || b.location === location) &&
        (!status || (b.status || "new") === status) &&
        (!date || b.date === date)
      );
    });
  }, [all, q, service, location, status, date]);

  useEffect(() => {
    setPage(1);
  }, [q, service, location, status, date]);

  // 📄 PAGINATION
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  // 🔄 STATUS UPDATE
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

  // 📤 EXPORT
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
      rows.map(r => r.join(",")).join("\n");

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

      {/* FILTER */}
      <div className="bg-white p-4 rounded-xl shadow grid md:grid-cols-5 gap-3">
        <input
          placeholder="Search"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <select value={service} onChange={e => setService(e.target.value)} className="border px-3 py-2 rounded">
          <option value="">Service</option>
          <option>Skin</option>
          <option>Hair</option>
        </select>

        <select value={location} onChange={e => setLocation(e.target.value)} className="border px-3 py-2 rounded">
          <option value="">Location</option>
          <option>Chennai</option>
        </select>

        <select value={status} onChange={e => setStatus(e.target.value)} className="border px-3 py-2 rounded">
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

      {/* CARDS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginated.map(b => (
          <div
            key={b._id}
            onClick={() => {
              setSelected(b);
              setForm(b);
            }}
            className="bg-white rounded-xl shadow p-5 cursor-pointer"
          >
            <h2 className="font-bold">{b.name}</h2>
            <p>{b.phone}</p>
            <p>{b.service}</p>
            <p>{b.date}</p>

            <select
              value={b.status || "new"}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                updateStatus(b._id, e.target.value)
              }
              className="border mt-2 w-full"
            >
              <option value="new">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="done">Done</option>
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

            <input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} className="border w-full p-2" />
            <input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} className="border w-full p-2" />
            <input value={form.service || ""} onChange={e => setForm({ ...form, service: e.target.value })} className="border w-full p-2" />

            <input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })} className="border w-full p-2" />
            <input type="time" value={form.time || ""} onChange={e => setForm({ ...form, time: e.target.value })} className="border w-full p-2" />

            <select value={form.status || "new"} onChange={e => setForm({ ...form, status: e.target.value })} className="border w-full p-2">
              <option value="new">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="done">Done</option>
            </select>

            <div className="flex justify-between">
              <button onClick={() => setSelected(null)} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>

              <button
                onClick={async () => {
                  await fetch("/api/admin/update-booking", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                  });

                  setAll(prev =>
                    prev.map(b =>
                      b._id === form._id ? form : b
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