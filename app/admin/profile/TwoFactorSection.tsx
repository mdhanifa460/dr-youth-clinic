"use client";

import { useEffect, useState } from "react";

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const primaryClass = "bg-[#0B2545] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a3a6e] disabled:opacity-50 transition";

export default function TwoFactorSection() {
  const [status, setStatus] = useState<{ enabled: boolean; backupCodesLeft: number } | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [turningOff, setTurningOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      const res = await fetch("/api/admin/profile/two-factor");
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch {
      setError("Couldn't load two-step login status");
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function send(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/profile/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Something went wrong");
        return null;
      }
      return data;
    } catch {
      setError("Network error. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function startSetup(e: React.FormEvent) {
    e.preventDefault();
    const data = await send({ action: "setup", password });
    if (data) {
      setSetup(data.data);
      setPassword("");
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    const data = await send({ action: "confirm", code });
    if (data) {
      setBackupCodes(data.data.backupCodes);
      setSetup(null);
      setCode("");
    }
  }

  async function turnOff(e: React.FormEvent) {
    e.preventDefault();
    const data = await send({ action: "disable", password, code });
    if (data) {
      setTurningOff(false);
      setPassword("");
      setCode("");
      loadStatus();
    }
  }

  if (!status) {
    return error ? <p className="text-sm text-red-600">{error}</p> : null;
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Two-Step Login</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.enabled || backupCodes ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {status.enabled || backupCodes ? "On" : "Off"}
        </span>
      </div>

      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {backupCodes ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Two-step login is on. Save these backup codes somewhere safe, away from your phone. Each one works once if you
            lose your phone, and they won&apos;t be shown again.
          </p>
          <ul className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-4 font-mono text-sm text-gray-800">
            {backupCodes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <button
            onClick={() => { setBackupCodes(null); loadStatus(); }}
            className={primaryClass}
          >
            I&apos;ve saved them
          </button>
        </div>
      ) : setup ? (
        <form onSubmit={confirmSetup} className="space-y-3">
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
            <li>Install Google Authenticator or a similar app on your phone.</li>
            <li>In the app, choose &quot;Enter a setup key&quot; and paste this key, keeping the type as time-based:</li>
          </ol>
          <p className="font-mono text-sm break-all bg-gray-50 rounded-xl px-4 py-3 select-all">{setup.secret}</p>
          <p className="text-xs text-gray-500">
            On this phone already? <a href={setup.uri} className="text-blue-600 underline">Open in your authenticator app</a>.
          </p>
          <label className="block text-sm text-gray-700">
            3. Enter the 6-digit code the app shows
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={`${inputClass} mt-1 font-mono tracking-widest`}
            />
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={busy || code.length !== 6} className={primaryClass}>
              {busy ? "Checking…" : "Turn On"}
            </button>
            <button type="button" onClick={() => { setSetup(null); setCode(""); setError(""); }} className="text-sm text-gray-500 hover:underline">
              Cancel
            </button>
          </div>
        </form>
      ) : status.enabled ? (
        turningOff ? (
          <form onSubmit={turnOff} className="space-y-3">
            <p className="text-sm text-gray-700">To turn this off, confirm your password and a current code.</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Current password" autoComplete="current-password" className={inputClass} />
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code or backup code" autoComplete="one-time-code" className={inputClass} />
            <div className="flex gap-3">
              <button type="submit" disabled={busy || !password || !code} className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition">
                {busy ? "Checking…" : "Turn Off"}
              </button>
              <button type="button" onClick={() => { setTurningOff(false); setError(""); }} className="text-sm text-gray-500 hover:underline">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              You&apos;ll enter a code from your phone each time you log in. Backup codes left: {status.backupCodesLeft}.
            </p>
            {status.backupCodesLeft <= 2 && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Running low. To get new backup codes, turn this off and set it up again.
              </p>
            )}
            <button onClick={() => setTurningOff(true)} className="text-sm text-red-600 hover:underline">Turn off</button>
          </div>
        )
      ) : (
        <form onSubmit={startSetup} className="space-y-3">
          <p className="text-sm text-gray-700">
            Protects your account if your password is ever stolen, by also asking for a code from your phone at login.
          </p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Current password" autoComplete="current-password" className={inputClass} />
          <button type="submit" disabled={busy || !password} className={primaryClass}>
            {busy ? "Checking…" : "Set Up"}
          </button>
        </form>
      )}
    </section>
  );
}
