"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema, FormData } from "../lib/validation";

export default function ConsultationCTA() {
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    // STEP FLOW
    if (step === 1) {
      const valid = await trigger(["name", "email", "phone"]);
      if (!valid) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      const valid = await trigger(["service"]);
      if (!valid) return;
      setStep(3);
      return;
    }

    if (step === 3) {
      const valid = await trigger(["location"]);
      if (!valid) return;
      setStep(4);
      return;
    }

    // FINAL SUBMIT
    const valid = await trigger(["date", "time"]);
    if (!valid) return;

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        alert("Booking Confirmed ✅");
      } else {
        alert("Failed ❌");
      }
    } catch (err) {
      console.error(err);
      alert("Error ❌");
    }
  };

  return (
    <section id="booking" className="py-20 px-6 md:px-10 bg-background">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12">

        {/* LEFT STEPPER */}
        <div className="lg:col-span-4 space-y-6">

          {["Personal Info", "Service", "Location", "Schedule"].map((label, index) => {
            const stepNum = index + 1;
            return (
              <div
                key={label}
                className={`flex items-center gap-3 ${
                  step === stepNum ? "text-primary font-bold" : "text-gray-400"
                }`}
              >
                <div className="w-8 h-8 rounded-full border flex items-center justify-center">
                  {stepNum}
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {/* RIGHT FORM */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-8 shadow">

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <input {...register("name")} placeholder="Full Name" className="input" />
                <p className="error">{errors.name?.message}</p>

                <input {...register("email")} placeholder="Email" className="input" />
                <p className="error">{errors.email?.message}</p>

                <input {...register("phone")} placeholder="Phone" className="input" />
                <p className="error">{errors.phone?.message}</p>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <select {...register("service")} className="input">
                  <option value="">Select Service</option>
                  <option value="Skin">Skin</option>
                  <option value="Hair">Hair</option>
                  <option value="Laser">Laser</option>
                </select>
                <p className="error">{errors.service?.message}</p>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <select {...register("location")} className="input">
                  <option value="">Select Location</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Kochi">Kochi</option>
                  <option value="Coimbatore">Coimbatore</option>
                </select>
                <p className="error">{errors.location?.message}</p>
              </>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <>
                <input type="date" {...register("date")} className="input" />
                <p className="error">{errors.date?.message}</p>

                <input type="time" {...register("time")} className="input" />
                <p className="error">{errors.time?.message}</p>
              </>
            )}

            {/* BUTTONS */}
            <div className="flex justify-between">

              {step > 1 && (
                <button type="button" onClick={() => setStep(step - 1)}>
                  ← Back
                </button>
              )}

              <button type="submit" className="bg-primary text-white px-6 py-3 rounded-xl">
                {step === 4 ? "Submit" : "Next"}
              </button>

            </div>

          </form>
        </div>
      </div>
    </section>
  );
}