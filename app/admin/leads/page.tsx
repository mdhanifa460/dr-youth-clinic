import { getAdminUser } from "@/app/lib/adminAuth";
import { redirect } from "next/navigation";
import LeadsClient from "./LeadsClient";

export default async function LeadsPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return <LeadsClient userRole={user.role} assignedClinics={user.assignedClinics} />;
}
