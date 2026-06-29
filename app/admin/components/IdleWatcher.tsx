"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const WARN_AFTER_MS  = 25 * 60 * 1000; // show warning at 25 min idle
const LOGOUT_AFTER_MS = 30 * 60 * 1000; // auto-logout at 30 min idle
const COUNTDOWN_SECS = 5 * 60;           // 5-minute countdown

const ACTIVITY_EVENTS = [
  "mousemove", "keydown", "click", "scroll", "touchstart",
] as const;

export default function IdleWatcher() {
  const router = useRouter();
  const [warning, setWarning] = useState(false);
  const [secs, setSecs]       = useState(COUNTDOWN_SECS);

  // Use refs so event-handler closures never go stale
  const warnTimer    = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimer  = useRef<ReturnType<typeof setTimeout>>();
  const tickInterval = useRef<ReturnType<typeof setInterval>>();
  const warningLive  = useRef(false); // mirrors `warning` state for use inside handlers
  const routerRef    = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  function clearAll() {
    clearTimeout(warnTimer.current);
    clearTimeout(logoutTimer.current);
    clearInterval(tickInterval.current);
  }

  function doLogout() {
    clearAll();
    fetch("/api/admin/logout", { method: "POST" }).finally(() => {
      routerRef.current.push("/admin/login?reason=idle");
      routerRef.current.refresh();
    });
  }

  function arm() {
    clearAll();
    warnTimer.current = setTimeout(() => {
      warningLive.current = true;
      setWarning(true);
      setSecs(COUNTDOWN_SECS);
      tickInterval.current = setInterval(
        () => setSecs((s) => Math.max(0, s - 1)),
        1000
      );
    }, WARN_AFTER_MS);
    logoutTimer.current = setTimeout(doLogout, LOGOUT_AFTER_MS);
  }

  function stayIn() {
    warningLive.current = false;
    setWarning(false);
    arm();
  }

  useEffect(() => {
    arm();

    let lastReset = 0;
    function onActivity() {
      if (warningLive.current) return; // don't reset during active warning
      const now = Date.now();
      if (now - lastReset < 30_000) return; // throttle: max once per 30 s
      lastReset = now;
      arm();
    }

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );
    return () => {
      clearAll();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger logout when the countdown reaches zero
  useEffect(() => {
    if (secs === 0 && warning) doLogout();
  }, [secs, warning]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!warning) return null;

  const m = Math.floor(secs / 60);
  const s = secs % 60;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl" role="img" aria-label="Warning">⚠️</span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Session Expiring</h2>
        <p className="text-sm text-gray-500 mb-5">
          No activity detected for 25 minutes.
          <br />You'll be logged out automatically in:
        </p>

        {/* Countdown */}
        <div
          className={`text-5xl font-mono font-bold tabular-nums mb-6 transition-colors ${
            secs <= 60 ? "text-red-600 animate-pulse" : "text-red-500"
          }`}
        >
          {m}:{String(s).padStart(2, "0")}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={stayIn}
            className="flex-1 bg-[#0B2560] text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-900 transition"
          >
            Stay Logged In
          </button>
          <button
            onClick={doLogout}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}
