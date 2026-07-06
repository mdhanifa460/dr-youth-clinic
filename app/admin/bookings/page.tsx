import { redirect } from "next/navigation";
import { getAdminUser } from "@/app/lib/adminAuth";
import { connectDB } from "@/app/lib/mongodb";
import { Doctor } from "@/app/models/Doctor";
import BookingsClient from "./BookingsClient";

export default async function BookingsPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  await connectDB();
  const doctors = await (Doctor as any).find({ active: true }).select("name locations").sort({ name: 1 }).lean();

  return (
    <BookingsClient
      userRole={user.role}
      assignedClinics={user.assignedClinics}
      doctors={doctors.map((d: any) => ({
        _id: String(d._id),
        name: d.name,
        locations: d.locations || [],
      }))}
    />
  );
}
