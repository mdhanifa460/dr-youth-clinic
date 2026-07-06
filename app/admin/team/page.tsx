"use client";

import { useEffect, useState } from "react";
import { ALL_ROLES, ROLE_LABELS, ROLE_COLORS, type AdminRole } from "@/app/lib/permissions";

type TeamMember = {
  _id: string;
  email: string;
  name: string;
  role: AdminRole;
  assignedClinics: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
};

const EMPTY_FORM = {
  name: "",
  email: "",
  role: "receptionist" as AdminRole,
  password: "",
  assignedClinics: ["all"] as string[],
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEdit(m: TeamMember) {
    setEditing(m);
    setForm({ name: m.name, email: m.email, role: m.role, password: "", assignedClinics: m.assignedClinics });
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
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">
                    {m.assignedClinics.join(", ")}
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
