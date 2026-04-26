"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

const logoSrc = "https://dryouthclinic.co.in/images/new-img/logo.png";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });

      if (!res.ok) {
        setError("Invalid email or password");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next || "/admin");
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fbff] text-[#0B2545]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#aab3c1]" />

      <div className="absolute right-0 top-[19vh] hidden h-[66vh] w-[45vw] rounded-l-[36px] bg-white/75 shadow-[0_32px_90px_rgba(11,37,69,0.08)] lg:block" />
      <div className="absolute right-0 bottom-0 hidden h-[74vh] w-[46vw] min-w-[520px] opacity-[0.075] lg:block">
        <Image
          src="/images/hero-clinical.jpeg"
          alt=""
          fill
          sizes="48vw"
          className="rounded-tl-[36px] object-cover"
          priority
        />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-6 py-6">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src={logoSrc}
            alt="DR Youth Clinic"
            width={180}
            height={56}
            className="h-12 w-auto object-contain"
            priority
          />
          <p className="mt-3 rounded-full border border-[#dbe6f2] bg-white/75 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-[#2d6fb0] shadow-sm">
            Admin Portal
          </p>
        </div>

        <div className="w-full max-w-[430px] text-center">
          <h1 className="text-3xl font-bold tracking-normal text-[#18202b] md:text-[34px]">
            Welcome Back
          </h1>
          <p className="mx-auto mt-3 max-w-[320px] text-sm leading-5 text-[#3f4d5c]">
            Please enter your credentials to access the clinical dashboard.
          </p>
        </div>

        <div className="mt-9 w-full max-w-[390px] rounded-[22px] border border-white bg-white/95 p-8 shadow-[0_24px_70px_rgba(11,37,69,0.09)]">
          <div className="mx-auto -mt-8 mb-7 h-1 w-full max-w-[324px] rounded-full bg-[#1A365D]" />

          <div className="space-y-5 text-left">
            <label className="block">
              <span className="text-xs font-bold text-[#0B2545]">
                Email or Username
              </span>
              <div className="mt-2 flex h-12 items-center gap-3 rounded-xl bg-[#e9eff6] px-4 text-[#8290a0]">
                <Mail className="h-4 w-4 shrink-0" />
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="e.g. admin@dryouth.com"
                  autoComplete="username"
                  className="h-full w-full bg-transparent text-sm text-[#0B2545] outline-none placeholder:text-[#8a96a5]"
                />
              </div>
            </label>

            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B2545]">
                  Password
                </span>
                <span className="text-[11px] font-semibold text-[#2d6fb0]">
                  Forgot Password?
                </span>
              </div>

              <div className="mt-2 flex h-12 items-center gap-3 rounded-xl bg-[#e9eff6] px-4 text-[#8290a0]">
                <Lock className="h-4 w-4 shrink-0" />
                <input
                  type={show ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin();
                    }
                  }}
                  className="h-full w-full bg-transparent text-sm text-[#0B2545] outline-none placeholder:text-[#8a96a5]"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#667789] transition hover:bg-white/70"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="flex items-center gap-3 text-xs font-medium text-[#3f4d5c]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-[#cfd7e2] text-[#0B2545] focus:ring-[#0B2545]"
              />
              Keep me logged in
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0B2545] text-sm font-bold text-white shadow-[0_14px_28px_rgba(11,37,69,0.24)] transition hover:bg-[#12345c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <ShieldCheck className="h-4 w-4" />
              {loading ? "Signing in..." : "Secure Login"}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-[#5b6675]">
          © 2024 DR Youth Clinic. All system access is monitored and logged for security compliance.
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-x-10 gap-y-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9aa6b7]">
          <span className="inline-flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            AES-256 Encrypted
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            HIPAA Compliant
          </span>
        </div>
      </section>
    </main>
  );
}
