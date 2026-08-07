import { getAdminUser } from "@/app/lib/adminAuth";
import { redirect } from "next/navigation";
import { connectDB } from "@/app/lib/mongodb";
import { Doctor } from "@/app/models/Doctor";
import LeadsClient from "./LeadsClient";

export default async function LeadsPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  await connectDB();
  const doctors = await (Doctor as any).find({ active: true }).select("name locations").sort({ name: 1 }).lean();

  return (
    <LeadsClient
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
