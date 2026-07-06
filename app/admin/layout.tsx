import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/app/lib/adminAuth";
import AdminSidebar from "./components/AdminSidebar";
import IdleWatcher from "./components/IdleWatcher";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") ?? "";
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  const user = await getAdminUser();
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <IdleWatcher />
      <AdminSidebar user={user} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
