import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/app/lib/adminAuth";
import { canAccess, type AdminModule } from "@/app/lib/permissions";
import AdminSidebar from "./components/AdminSidebar";
import IdleWatcher from "./components/IdleWatcher";

// Maps URL prefix → required module (longest prefix wins)
const MODULE_MAP: [string, AdminModule][] = [
  ["/admin/intelligence",  "intelligence"],
  ["/admin/bookings",      "bookings"],
  ["/admin/update-booking","bookings"],
  ["/admin/update-status", "bookings"],
  ["/admin/services",      "services"],
  ["/admin/doctors",       "doctors"],
  ["/admin/homepage",      "homepage"],
  ["/admin/locations",     "locations"],
  ["/admin/offers",        "offers"],
  ["/admin/reviews",       "reviews"],
  ["/admin/blog",          "blog"],
  ["/admin/seo",           "seo"],
  ["/admin/landing-pages", "landing-pages"],
  ["/admin/quiz",          "services"],
  ["/admin/settings",      "settings"],
  ["/admin/team",          "team"],
  ["/admin/profile",       "dashboard"],
  ["/admin",               "dashboard"],
];

function moduleForPath(pathname: string): AdminModule | null {
  // Sort by descending prefix length so most specific wins
  const sorted = [...MODULE_MAP].sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, mod] of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return mod;
  }
  return null;
}

function AccessDenied({ module }: { module: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h1>
      <p className="text-gray-500 max-w-sm">
        Your role does not have permission to access <strong>{module}</strong>. Contact your admin if you need access.
      </p>
    </div>
  );
}

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

  const requiredModule = moduleForPath(pathname);
  const allowed = !requiredModule || canAccess(user.role, requiredModule);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <IdleWatcher />
      <AdminSidebar user={user} />
      <main className="flex-1 p-6">
        {allowed ? children : <AccessDenied module={requiredModule ?? ""} />}
      </main>
    </div>
  );
}
