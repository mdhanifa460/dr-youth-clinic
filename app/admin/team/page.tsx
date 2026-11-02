"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ALL_ROLES, ALL_MODULES, ROLE_LABELS, ROLE_COLORS, ROLE_PERMISSIONS, type AdminRole, type AdminModule, type AccessLevel, type PermissionOverrides } from "@/app/lib/permissions";

type TeamMember = {
  _id: string;
  email: string;
  name: string;
  role: AdminRole;
  assignedClinics: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  permissionOverrides?: PermissionOverrides;
};

const MODULE_LABELS: Record<AdminModule, string> = {
  dashboard: "Dashboard", intelligence: "Intelligence", bookings: "Bookings",
  leads: "Leads", services: "Services", doctors: "Doctors", homepage: "Homepage",
  locations: "Locations", offers: "Offers", results: "Results", achievements: "Achievements & Awards", reviews: "Reviews",
  blog: "Blog", seo: "SEO", "landing-pages": "Landing Pages", settings: "Settings",
  team: "Team", videos: "Videos", "ai-assessment": "AI Assessment", journey: "Journey",
  legal: "Legal", ai: "AI", stories: "Stories", faqs: "FAQs", banners: "Banners",
  courses: "Courses", "animation-library": "Animation Library",
  "booking-success": "Booking Success", integrations: "Integrations", analytics: "Analytics",
};

const LEVEL_LABELS: Record<AccessLevel, string> = { full: "Full", view: "View only", none: "No access" };

const EMPTY_FORM = {
  name: "",
  email: "",
  role: "receptionist" as AdminRole,
  password: "",
  assignedClinics: ["all"] as string[],
  permissionOverrides: {} as PermissionOverrides,
};

function generatePassword() {
  // No lookalike characters (0/O, 1/l/I) since this often gets read out or retyped.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(14)), (n) => chars[n % chars.length]).join("");
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<{ _id: string; role: AdminRole } | null>(null);
  const [resetting, setResetting] = useState<TeamMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      const data = await res.json();
      if (data.success) setMembers(data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    fetch("/api/admin/profile").then((r) => r.json()).then((d) => { if (d.success) setMe(d.data); }).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEdit(m: TeamMember) {
    setEditing(m);
    setForm({ name: m.name, email: m.email, role: m.role, password: "", assignedClinics: m.assignedClinics ?? ["all"], permissionOverrides: { ...(m.permissionOverrides ?? {}) } });
    setError("");
    setShowModal(true);
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      const url = editing ? `/api/admin/team/${editing._id}` : "/api/admin/team";
      const method = editing ? "PUT" : "POST";
      const body: Record<string, any> = { name: form.name, role: form.role, assignedClinics: form.assignedClinics };
      if (!editing) { body.email = form.email; body.password = form.password; }
      // Only sent when the override editor was actually shown for this edit
      // (create has no overrides yet; self-editing as non-super_admin hides
      // it entirely) — otherwise an unrelated save (e.g. just fixing your
      // own name) would re-submit your own unchanged overrides and trip the
      // server's self-edit guard for no reason.
      const overridesEditable = !!editing && (me?.role === "super_admin" || editing._id !== me?._id);
      if (overridesEditable) body.permissionOverrides = form.permissionOverrides;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Failed"); return; }
      setShowModal(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(m: TeamMember) {
    if (!confirm(m.isActive ? `Deactivate ${m.name}? They'll be logged out of all devices.` : `Reactivate ${m.name}?`)) return;
    const method = m.isActive ? "DELETE" : "PUT";
    const body = m.isActive ? undefined : JSON.stringify({ isActive: true });
    const res = await fetch(`/api/admin/team/${m._id}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    });
    const data = await res.json();
    if (data.success) load();
    else alert(data.message || "Failed");
  }

  async function deleteMember(m: TeamMember) {
    if (!confirm(`Permanently delete ${m.name} (${m.email})?\n\nThis can't be undone and logs them out immediately. To only block their access, use Deactivate instead.`)) return;
    const res = await fetch(`/api/admin/team/${m._id}?permanent=true`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) load();
    else alert(data.message || "Failed");
  }

  // Mirrors the server's guards, which remain the real enforcement.
  function canManage(m: TeamMember) {
    return m.role !== "super_admin" || me?.role === "super_admin";
  }

  function canResetOrDelete(m: TeamMember) {
    return !!me && m._id !== me._id && canManage(m);
  }

  function openReset(m: TeamMember) {
    setResetting(m);
    setNewPassword("");
    setResetError("");
    setResetDone(false);
    setCopied(false);
  }

  async function submitReset() {
    if (!resetting) return;
    setResetError("");
    setResetSaving(true);
    try {
      const res = await fetch(`/api/admin/team/${resetting._id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!data.success) { setResetError(data.message || "Failed"); return; }
      setResetDone(true);
    } catch {
      setResetError("Failed to reset password");
    } finally {
      setResetSaving(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
    } catch {
      setResetError("Couldn't copy — select the password and copy it manually");
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage admin users and their access roles</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/team/activity" className="text-sm text-blue-600 hover:underline">Activity Log</Link>
          <button
            onClick={openCreate}
            className="bg-[#0B2545] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1a3a6e] transition"
          >
            + Add Member
          </button>
        </div>
      </div>

      <details className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-gray-700">
        <summary className="font-semibold cursor-pointer">When someone leaves (any role)</summary>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Click Deactivate here at the moment they exit. It logs them out everywhere. Keep the account instead of deleting it, so their history stays linked.</li>
          <li>Change any password they knew, including shared logins.</li>
          <li>Remove them from Google (Search Console, Analytics, Tag Manager, Ads, Business Profile), Meta Business, the domain/DNS provider, Vercel, GitHub, MongoDB Atlas, SEO tools and company email.</li>
          <li>If they had Vercel, GitHub or Atlas access, change the database password, ADMIN_SESSION_SECRET and API keys.</li>
          <li>Check the Activity Log and recent lead exports for anything unusual.</li>
          <li>If they were a super admin, make sure at least two other named people still have super admin.</li>
        </ol>
      </details>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Clinics</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Login</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((m) => (
                <tr key={m._id} className={`${!m.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3 text-gray-500">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role]}`}>
                      {ROLE_LABELS[m.role]}
                    </span>
                    {m.permissionOverrides && Object.keys(m.permissionOverrides).length > 0 && (
                      <span
                        className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700"
                        title={`Custom access on: ${Object.keys(m.permissionOverrides).join(", ")}`}
                      >
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">
                    {(m.assignedClinics ?? ["all"]).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }) : "Never"}
                  </td>
                  <td className="px-4 py-3 flex flex-wrap gap-x-2 gap-y-1">
                    {canManage(m) && (
                      <button onClick={() => openEdit(m)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    )}
                    {canResetOrDelete(m) && (
                      <button onClick={() => openReset(m)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Reset Password</button>
                    )}
                    {canManage(m) && (
                      <button onClick={() => toggleActive(m)} className={`text-xs ${m.isActive ? "text-red-500" : "text-green-600"} hover:underline`}>
                        {m.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                    {canResetOrDelete(m) && (
                      <button onClick={() => deleteMember(m)} className="text-xs text-red-700 font-semibold hover:underline">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No team members yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Member" : "Add Team Member"}</h2>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Dr. Priya Sharma"
                />
              </div>

              {!editing && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="priya@dryouthclinic.com"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRole }))}
                >
                  {ALL_ROLES.filter((r) => r !== "super_admin" || me?.role === "super_admin").map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              {!editing && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min 8 characters"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Clinics</label>
                <div className="flex flex-wrap gap-2">
                  {["all", "chennai", "bangalore", "coimbatore", "kochi"].map((clinic) => (
                    <label key={clinic} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignedClinics.includes(clinic)}
                        onChange={(e) => {
                          setForm((f) => {
                            if (clinic === "all") {
                              return { ...f, assignedClinics: e.target.checked ? ["all"] : [] };
                            }
                            const next = e.target.checked
                              ? [...f.assignedClinics.filter((c) => c !== "all"), clinic]
                              : f.assignedClinics.filter((c) => c !== clinic);
                            return { ...f, assignedClinics: next };
                          });
                        }}
                      />
                      <span className="capitalize">{clinic === "all" ? "All Clinics" : clinic}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {editing && (me?.role === "super_admin" || editing._id !== me?._id) && (
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-600 mb-1">Custom Permissions</p>
                <p className="text-[11px] text-gray-400 mb-3">
                  Overrides {ROLE_LABELS[form.role]}&apos;s default access for {editing.name} only. Leave
                  everything on &quot;Role default&quot; unless this person genuinely needs an exception.
                </p>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {ALL_MODULES.map((mod) => {
                    const roleDefault = ROLE_PERMISSIONS[form.role]?.[mod] ?? "none";
                    const current = form.permissionOverrides[mod] ?? "";
                    return (
                      <div key={mod} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-600">{MODULE_LABELS[mod]}</span>
                        <select
                          className="border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={current}
                          onChange={(e) => {
                            const value = e.target.value as AccessLevel | "";
                            setForm((f) => {
                              const next = { ...f.permissionOverrides };
                              if (value === "") delete next[mod];
                              else next[mod] = value;
                              return { ...f, permissionOverrides: next };
                            });
                          }}
                        >
                          <option value="">Role default ({LEVEL_LABELS[roleDefault]})</option>
                          <option value="full">Full</option>
                          <option value="view">View only</option>
                          <option value="none">No access</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {editing && me && editing._id === me._id && me.role !== "super_admin" && (
              <p className="text-[11px] text-gray-400 border-t pt-4">
                You can&apos;t change your own custom permissions — ask a super admin.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-[#0B2545] text-white rounded-lg py-2 text-sm font-semibold hover:bg-[#1a3a6e] disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Reset Password</h2>
              <p className="text-sm text-gray-500 mt-1">{resetting.name} ({resetting.email})</p>
            </div>

            {resetError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{resetError}</p>}

            {resetDone ? (
              <>
                <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2">
                  Password updated and {resetting.name} has been logged out everywhere. Share the new password
                  securely — it won&apos;t be shown again.
                </p>
                <div className="flex gap-2">
                  <input readOnly value={newPassword} className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm font-mono bg-gray-50" />
                  <button onClick={copyPassword} className="border rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={() => setResetting(null)}
                  className="w-full bg-[#0B2545] text-white rounded-lg py-2 text-sm font-semibold hover:bg-[#1a3a6e]"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoComplete="off"
                      className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                    />
                    <button
                      onClick={() => setNewPassword(generatePassword())}
                      className="border rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">This logs {resetting.name} out of all devices.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setResetting(null)}
                    className="flex-1 border rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReset}
                    disabled={resetSaving || newPassword.length < 8}
                    className="flex-1 bg-[#0B2545] text-white rounded-lg py-2 text-sm font-semibold hover:bg-[#1a3a6e] disabled:opacity-50"
                  >
                    {resetSaving ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
