"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function ConsultationForm({ step, setStep }: any) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
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
    setError("");
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => setStep(step - 1);

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!form.name.trim()) {
        setError("Please enter your name");
        return false;
      }
      if (!form.email.trim() || !form.email.includes("@")) {
        setError("Please enter a valid email");
        return false;
      }
      if (!form.phone.trim() || form.phone.length < 10) {
        setError("Please enter a valid phone number");
        return false;
      }
      if (!form.dob) {
        setError("Please select your date of birth");
        return false;
      }
      if (!form.concern.trim()) {
        setError("Please describe your concern");
        return false;
      }
    }
    if (currentStep === 2 && !form.service) {
      setError("Please select a service");
      return false;
    }
    if (currentStep === 3 && !form.location) {
      setError("Please select a location");
      return false;
    }
    if (currentStep === 4) {
      if (!form.date) {
        setError("Please select a date");
        return false;
      }
      if (!form.time) {
        setError("Please select a time");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    setError("");

    try {
      const formattedPhone = form.phone.startsWith("91")
        ? form.phone
        : "91" + form.phone;

      const payload = {
        ...form,
        phone: formattedPhone,
      };

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setBookingId(data.bookingId);
        setSuccess(true);
      } else {
        setError(data.message || "Booking failed. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="flex justify-center">
          <CheckCircle size={64} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-green-600">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600 text-lg">
          Your appointment has been successfully scheduled.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Booking ID:</p>
          <p className="text-xl font-bold text-blue-600">{bookingId}</p>
        </div>
        <p className="text-gray-500">
          A confirmation email has been sent to {form.email}
        </p>
        <button
          onClick={() => window.location.href = "/"}
          className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PROGRESS BAR */}
      <div className="w-full bg-gray-200 h-2 rounded-full">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <>
          <h2 className="text-2xl font-bold text-primary">Personal Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full Name *"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email Address *"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone Number *"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <textarea
            name="concern"
            value={form.concern}
            onChange={handleChange}
            placeholder="Describe your skin/hair concern *"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
          />

          <div className="flex justify-end">
            <button
              onClick={nextStep}
              className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <h2 className="text-2xl font-bold text-primary">Select Service</h2>

          <div className="grid grid-cols-3 gap-4">
            {["Skin", "Hair", "Laser"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setForm({ ...form, service: s });
                  setError("");
                }}
                className={`p-6 rounded-xl border-2 font-semibold transition ${
                  form.service === s
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-gray-300 hover:border-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={prevStep}
              className="px-8 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              ← Back
            </button>

            <button
              onClick={nextStep}
              disabled={!form.service}
              className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <>
          <h2 className="text-2xl font-bold text-primary">Select Clinic Location</h2>

          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.location}
            onChange={(e) => {
              setForm({ ...form, location: e.target.value });
              setError("");
            }}
          >
            <option value="">Choose a Location *</option>
            <option value="Chennai">Chennai</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Kochi">Kochi</option>
            <option value="Coimbatore">Coimbatore</option>
          </select>

          <div className="flex justify-between pt-6">
            <button
              onClick={prevStep}
              className="px-8 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              ← Back
            </button>

            <button
              onClick={nextStep}
              disabled={!form.location}
              className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <>
          <h2 className="text-2xl font-bold text-primary">Schedule Appointment</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Select Date *</label>
              <input
                type="date"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.date}
                onChange={(e) => {
                  setForm({ ...form, date: e.target.value });
                  setError("");
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Select Time *</label>
              <input
                type="time"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.time}
                onChange={(e) => {
                  setForm({ ...form, time: e.target.value });
                  setError("");
                }}
              />
            </div>
          </div>

          {/* SUMMARY */}
          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <h3 className="font-bold text-blue-900 mb-3">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p><span className="font-semibold">Name:</span> {form.name}</p>
              <p><span className="font-semibold">Service:</span> {form.service}</p>
              <p><span className="font-semibold">Location:</span> {form.location}</p>
              <p><span className="font-semibold">Date:</span> {form.date}</p>
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <button
              onClick={prevStep}
              className="px-8 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              ← Back
            </button>

            <button
              disabled={loading}
              onClick={handleSubmit}
              className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? "Booking..." : "Confirm Booking"}
            </button>
          </div>
        </>
      )}

    </div>
  );
}