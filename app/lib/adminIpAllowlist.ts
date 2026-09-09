// Optional network-level restriction on top of admin login (defense in
// depth: even a leaked/guessed password shouldn't be reachable from
// outside the clinic's own network). Kept dependency-free and pure
// (no next/headers, no Node-only APIs) so it works unmodified in
// middleware.ts's Edge runtime — same constraint app/lib/utmAttribution.ts
// documents for itself.
//
// Deliberately OFF by default: an empty/unset allowlist means "no
// restriction," not "block everyone." This is safety-critical — the
// allowlist is configured via a Vercel environment variable (ADMIN_
// IP_ALLOWLIST), a control surface that lives OUTSIDE this app entirely,
// specifically so a wrong or stale entry can never lock the admin out of
// their own site with no way back in: fixing it is always just editing
// the env var in the Vercel dashboard and redeploying, never something
// that requires reaching the now-blocked /admin panel itself.

export function parseAdminAllowlist(raw?: string | null): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const v = Number(part);
    if (v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

// Supports a bare IPv4 address, or IPv4 CIDR notation ("203.0.113.0/24") —
// the two shapes an office/ISP static-IP allowlist actually needs. IPv6
// entries are matched as an exact string only (no CIDR support) since a
// residential/office IPv6 prefix is rarely stable enough to allowlist in
// practice; most real-world use of this is a clinic's static IPv4 uplink.
export function isIpAllowed(ip: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true; // restriction disabled
  const clean = (ip || "").trim();
  if (!clean || clean === "unknown") return false;

  for (const entry of allowlist) {
    if (entry === clean) return true;

    if (entry.includes("/")) {
      const [range, bitsStr] = entry.split("/");
      const bits = Number(bitsStr);
      if (!Number.isInteger(bits) || bits < 0 || bits > 32) continue;
      const rangeInt = ipv4ToInt(range);
      const ipInt = ipv4ToInt(clean);
      if (rangeInt === null || ipInt === null) continue;
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      if ((rangeInt & mask) === (ipInt & mask)) return true;
    }
  }
  return false;
}

// Same first-entry-of-x-forwarded-for convention as
// app/lib/rateLimit.ts:getClientIp — duplicated (not imported) so this
// file stays a standalone, zero-dependency module middleware.ts can pull
// in without also loading rateLimit.ts's Redis client / setInterval
// side effects for what is otherwise a one-line header read.
export function getRequestIp(req: { headers: Headers }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
