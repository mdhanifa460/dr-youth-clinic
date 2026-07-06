import { getAdminUser } from "@/app/lib/adminAuth";
import { redirect } from "next/navigation";
import { connectDB } from "@/app/lib/mongodb";
import { Doctor } from "@/app/models/Doctor";
import DoctorAvailabilityClient from "./DoctorAvailabilityClient";

export default async function DoctorAvailabilityPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  await connectDB();
  const doctors = await (Doctor as any).find({ active: true }).select("_id name locations").sort({ name: 1 }).lean();

  return (
    <DoctorAvailabilityClient
      userRole={user.role}
      linkedDoctorId={(user as any).linkedDoctorId ? String((user as any).linkedDoctorId) : null}
      doctors={doctors.map((d: any) => ({ _id: String(d._id), name: d.name, locations: d.locations }))}
    />
  );
}
