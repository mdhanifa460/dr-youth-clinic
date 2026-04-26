"use client";

import { useState } from "react";

export default function ConsultationForm({ step, setStep }: any) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState("");

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

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // 👉 FIX PHONE FORMAT
      const formattedPhone = form.phone.startsWith("91")
        ? form.phone
        : "91" + form.phone;

      const payload = {
        ...form,
        phone: formattedPhone,
      };

      console.log("🚀 SENDING DATA:", payload);

      console.log("FORM SUBMIT:", payload);

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // ✅ FIXED
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("API RESPONSE:", data);

      if (data.success) {
        setBookingId(data.bookingId);
        setSuccess(true);
      } else {
        alert("Failed ❌");
      }
    } catch (err) {
      console.error(err);
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
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full Name"
              className="input"
            />

            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="input"
            />

            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone"
              className="input"
            />

            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              className="input"
            />
          </div>

          <textarea
            name="concern"
            value={form.concern}
            onChange={handleChange}
            placeholder="Concern"
            className="input"
          />

          <div className="flex justify-end">
            <button
              onClick={nextStep}
              className="bg-[#0B2545] text-white px-6 py-2 rounded"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <h2 className="text-xl font-bold">Select Service</h2>

          <div className="grid grid-cols-3 gap-4">
            {["Skin", "Hair", "Laser"].map((s) => (
              <button
                key={s}
                onClick={() => setForm({ ...form, service: s })}
                className={`p-4 rounded-xl border ${form.service === s
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

            <button
              onClick={nextStep}
              disabled={!form.service}
              className="bg-[#0B2545] text-white px-6 py-2 rounded"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <>
          <h2 className="text-xl font-bold">Select Clinic Location</h2>

          <select
            className="input"
            value={form.location}
            onChange={(e) =>
              setForm({ ...form, location: e.target.value })
            }
          >
            <option value="">Choose Location</option>
            <option value="Chennai">Chennai</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Kochi">Kochi</option>
            <option value="Coimbatore">Coimbatore</option>
          </select>

          <div className="flex justify-between mt-6">
            <button onClick={prevStep}>← Back</button>

            <button
              onClick={nextStep}
              disabled={!form.location}
              className="bg-[#0B2545] text-white px-6 py-2 rounded"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <>
          <h2 className="text-xl font-bold">Schedule Appointment</h2>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
              placeholder="Select date"
            />

            <input
              type="time"
              className="input"
              value={form.time}
              onChange={(e) =>
                setForm({ ...form, time: e.target.value })
              }
              placeholder="Select time"
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