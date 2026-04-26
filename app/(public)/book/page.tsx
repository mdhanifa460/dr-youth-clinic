"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import ConsultationForm from "./Form";

export default function BookingPage() {
  const [step, setStep] = useState(1);

  return (
    <main className="max-w-7xl mx-auto px-6 py-16">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

        <aside className="lg:col-span-4">
          <Sidebar step={step} />
        </aside>

        <section className="lg:col-span-8 bg-white rounded-3xl p-10 shadow">
          <ConsultationForm step={step} setStep={setStep} />
        </section>

      </div>

    </main>
  );
}