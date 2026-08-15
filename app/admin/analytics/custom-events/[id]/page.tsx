"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader } from "lucide-react";
import CustomEventForm, { type CustomEventFormValue } from "../CustomEventForm";

export default function EditCustomEventPage() {
  const params = useParams();
  const id = params.id as string;
  const [initial, setInitial] = useState<CustomEventFormValue | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/analytics/custom-events/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInitial(d.data);
        else setError(d.message || "Custom event not found");
      })
      .catch(() => setError("Failed to load custom event"));
  }, [id]);

  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!initial) return <div className="text-center py-20 text-gray-400"><Loader className="animate-spin mx-auto" size={22} /></div>;

  return <CustomEventForm mode="edit" initial={initial} />;
}
