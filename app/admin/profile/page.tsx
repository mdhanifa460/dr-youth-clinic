"use client";

import { useState } from "react";
import { ROLE_LABELS, ROLE_COLORS, type AdminRole } from "@/app/lib/permissions";

type ProfileForm = {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY: ProfileForm = { name: "", currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const set = (field: keyof ProfileForm, val: string) => {
    setForm((f) => ({ ...f, [field]: val }));
    setError("");
    setSuccess("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (form.newPassword && form.newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const body: Record<string, string> = {};
      if (form.name.trim()) body.name = form.name.trim();
      if (form.newPassword) {
        body.currentPassword = form.currentPassword;
        body.newPassword = form.newPassword;
      }

      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccess("Profile updated successfully");
      setForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your name or change your password</p>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">

        {/* Name */}
        <div className="px-6 py-5 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Display Name</h2>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Your full name"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password */}
        <div className="px-6 py-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => set("currentPassword", e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => set("newPassword", e.target.value)}
            placeholder="New password (min 8 characters)"
            autoComplete="new-password"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <div className="px-6 py-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#0B2545] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a3a6e] disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {success && <p className="text-sm text-green-600 font-medium">{success}</p>}
          {error   && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </form>
    </div>
  );
}
