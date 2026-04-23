"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema, FormData } from "../lib/validation";

export default function ConsultationForm() {
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    // STEP 1 VALIDATION
    if (step === 1) {
      const valid = await trigger(["name", "email", "phone"]);
      if (!valid) return;
      setStep(2);
    }

    // STEP 2 VALIDATION
    else if (step === 2) {
      const valid = await trigger(["service"]);
      if (!valid) return;
      setStep(3);
    }

    // STEP 3 VALIDATION
    else if (step === 3) {
      const valid = await trigger(["location"]);
      if (!valid) return;
      setStep(4);
    }

    // FINAL SUBMIT
    else {
      const valid = await trigger(["date", "time"]);
      if (!valid) return;

      console.log("FINAL DATA:", data);

      alert("Booking Submitted Successfully!");
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow space-y-6">

      <h3 className="text-xl font-bold text-primary">
        Step {step} of 4
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <input
              {...register("name")}
              placeholder="Full Name"
              className="input"
            />
            <p className="error">{errors.name?.message}</p>

            <input
              {...register("email")}
              placeholder="Email"
              className="input"
            />
            <p className="error">{errors.email?.message}</p>

            <input
              {...register("phone")}
              placeholder="Phone"
              className="input"
            />
            <p className="error">{errors.phone?.message}</p>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <select {...register("service")} className="input">
              <option value="">Select Service</option>
              <option value="skin">Skin</option>
              <option value="hair">Hair</option>
              <option value="laser">Laser</option>
            </select>
            <p className="error">{errors.service?.message}</p>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <select {...register("location")} className="input">
              <option value="">Select Location</option>
              <option value="chennai">Chennai</option>
              <option value="bangalore">Bangalore</option>
              <option value="kochi">Kochi</option>
              <option value="coimbatore">Coimbatore</option>
            </select>
            <p className="error">{errors.location?.message}</p>
          </>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <>
            <input
              type="date"
              {...register("date")}
              className="input"
            />
            <p className="error">{errors.date?.message}</p>

            <input
              type="time"
              {...register("time")}
              className="input"
            />
            <p className="error">{errors.time?.message}</p>
          </>
        )}

        {/* BUTTONS */}
        <div className="flex justify-between items-center">

          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="text-gray-500"
            >
              ← Back
            </button>
          )}

          <button
            type="submit"
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold"
          >
            {step === 4 ? "Submit" : "Next"}
          </button>

        </div>

      </form>
    </div>
  );
}