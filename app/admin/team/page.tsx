"use client";

import { useEffect, useState } from "react";
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
  locations: "Locations", offers: "Offers", results: "Results", reviews: "Reviews",
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

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<{ _id: string; role: AdminRole } | null>(null);

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
      else if (form.password) { body.password = form.password; }
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
    if (!confirm(`${m.isActive ? "Deactivate" : "Reactivate"} ${m.name}?`)) return;
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage admin users and their access roles</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#0B2545] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1a3a6e] transition"
        >
          + Add Member
        </button>
      </div>

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
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(m)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggleActive(m)} className={`text-xs ${m.isActive ? "text-red-500" : "text-green-600"} hover:underline`}>
                      {m.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No team members yet</td></tr>
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
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {editing ? "New Password (leave blank to keep)" : "Password"}
                </label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? "Leave blank to keep current" : "Min 8 characters"}
                />
              </div>

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
    </div>
  );
}
