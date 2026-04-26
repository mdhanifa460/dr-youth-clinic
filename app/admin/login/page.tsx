"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);

    setTimeout(() => {
      if (password === "admin123") {
        localStorage.setItem("admin", "true");
        router.push("/admin");
      } else {
        setError("Invalid password ❌");
      }
      setLoading(false);
    }, 500); // small delay for UX
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B2545] to-[#1E3A8A]">

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-[350px] space-y-6">

        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#0B2545]">
            DR Youth Clinic
          </h1>
          <p className="text-gray-500 text-sm">
            Admin Panel Login
          </p>
        </div>

        {/* PASSWORD FIELD */}
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin(); // ⌨️ Enter submit
              }
            }}
            className="w-full border rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#0B2545]"
          />

          {/* 👁 SHOW / HIDE */}
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {show ? "🙈" : "👁"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        {/* BUTTON */}
        <button
          onClick={handleLogin}
          className="w-full bg-[#0B2545] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition flex justify-center items-center"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* FOOTER */}
        <p className="text-center text-xs text-gray-400">
          Secure access only
        </p>

      </div>
    </div>
  );
}