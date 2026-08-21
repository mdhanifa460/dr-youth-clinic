// VPN/proxy/datacenter detection — a risk SIGNAL only, never a gate. Real
// booking/e-commerce sites don't hard-block VPN traffic outright: plenty of
// genuine patients use a VPN for privacy, and a hard block loses them as a
// lead with zero recovery path. This flags a booking for staff visibility
// (lower lead-quality signal, a badge in the admin list) instead — the
// admin decides case by case, matching how top consumer sites actually
// handle this rather than a blanket block.
//
// Uses ip-api.com's free, keyless tier (45 req/min, more than this site's
// booking volume needs) — no new paid integration, no API key to manage.
// Best-effort only: any failure (timeout, rate limit, network error) is
// swallowed and treated as "unknown," never as "flagged" — an absent
// signal should never look like a positive one, same convention as every
// other soft signal in app/lib/leadQualification/signals.ts.
export interface IpRiskResult {
  isVpnOrProxy: boolean;
  checked: boolean; // false when the lookup itself failed/timed out — "unknown," not "clean"
}

const TIMEOUT_MS = 2500;

export async function checkIpRisk(ip: string): Promise<IpRiskResult> {
  // Loopback/private/unknown — nothing meaningful to check (local dev, or
  // a request with no real client IP attached).
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return { isVpnOrProxy: false, checked: false };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { isVpnOrProxy: false, checked: false };
    const data = await res.json();
    if (data.status !== 'success') return { isVpnOrProxy: false, checked: false };
    // `proxy` covers VPN/proxy/Tor exit nodes; `hosting` covers datacenter/
    // cloud IPs (a real visitor is essentially never browsing from one —
    // this catches server-side/bot traffic a VPN check alone would miss).
    return { isVpnOrProxy: !!(data.proxy || data.hosting), checked: true };
  } catch {
    return { isVpnOrProxy: false, checked: false };
  }
}
