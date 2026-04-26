"use client";

import { useState } from "react";

export default function ConsultationForm({ step, setStep }: any) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [locationDetected, setLocationDetected] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    concern: "",
    service: "",
    date: "",
    time: "",
    location: "",
  });

  const detectLocation = () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    setLocationDetected(`Lat: ${lat}, Lng: ${lng}`);
    setForm({ ...form, location: `Lat: ${lat}, Lng: ${lng}` });
  });
};

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setBookingId(data.bookingId ?? data.booking?.bookingId ?? data.booking?._id ?? "");
        setSuccess(true);
      }
    } catch {
      alert("Error ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ SUCCESS SCREEN
  if (success) {
    return (
      <div className="text-center py-20 space-y-4">

        <h2 className="text-2xl font-bold text-green-600">
          🎉 Booking Confirmed!
        </h2>

        <p className="text-gray-500">
          Booking ID: {bookingId}
        </p>

      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* PROGRESS BAR */}
      <div className="w-full bg-gray-200 h-2 rounded-full">
        <div
          className="bg-[#0B2545] h-2 rounded-full transition-all"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <>
          <h2 className="text-xl font-bold">Patient Identification</h2>

          <div className="grid grid-cols-2 gap-4">
            <input name="name" placeholder="Full Name" onChange={handleChange} className="input" />
            <input name="email" placeholder="Email" onChange={handleChange} className="input" />
            <input name="phone" placeholder="Phone" onChange={handleChange} className="input" />
            <input
              type="date"
              name="dob"
              onChange={handleChange}
              className="input"
              placeholder="Date of Birth"
              title="Date of Birth"
            />
          </div>

          <textarea name="concern" placeholder="Concern" className="input" onChange={handleChange} />

          <div className="flex justify-end">
            <button onClick={nextStep} className="bg-[#0B2545] text-white px-6 py-2 rounded">
              Continue →
            </button>
          </div>
        </>
      )}

      {step === 2 && (
  <>
    <h2 className="text-xl font-bold">Select Service</h2>

    <div className="grid grid-cols-3 gap-4">

      {["Skin", "Hair", "Laser"].map((s) => (
        <button
          key={s}
          onClick={() => setForm({ ...form, service: s })}
          className={`p-4 rounded-xl border ${
            form.service === s
              ? "bg-[#0B2545] text-white"
              : "bg-white"
          }`}
        >
          {s}
        </button>
      ))}

    </div>

    <div className="flex justify-between">
      <button onClick={prevStep}>← Back</button>
      <button onClick={nextStep}>Continue →</button>
    </div>
  </>
)}

      {/* STEP 4 FINAL */}
     {step === 4 && (
  <>
    <h2 className="text-xl font-bold">Schedule Appointment</h2>

    <div className="grid grid-cols-2 gap-4">
      <input
        type="date"
        className="input"
        placeholder="Select date"
        title="Appointment Date"
        onChange={(e) =>
          setForm({ ...form, date: e.target.value })
        }
      />

      <input
        type="time"
        className="input"
        placeholder="Select time"
        title="Appointment Time"
        onChange={(e) =>
          setForm({ ...form, time: e.target.value })
        }
      />
    </div>

    <div className="flex justify-between mt-4">
      <button onClick={prevStep}>← Back</button>

      <button
        disabled={loading}
        onClick={handleSubmit}
        className="bg-[#0B2545] text-white px-6 py-2 rounded"
      >
        {loading ? "Booking..." : "Confirm Booking"}
      </button>
    </div>
  </>
)}

    </div>
  );
}
