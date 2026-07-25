# 0003 — Every `.populate()` call site must import the referenced model directly

**Status:** Active — learned the hard way

**Context:** Several routes called `.populate('doctor')` or `.populate('service')` without ever importing the `Doctor` or `Service` model in that file. This worked perfectly in `next dev`, because dev runs one long-lived Node process — as soon as *any* route imports `Doctor`, it's registered with Mongoose for the rest of that process's life, including for unrelated routes that never imported it themselves. In production, each API route and page is bundled into its own isolated serverless function. If a route's own bundle never imports the model it populates, `mongoose.model('Doctor')` throws `MissingSchemaError` at request time — and because most routes wrap their query in a generic `try/catch`, this surfaced as silently empty/failed responses (real, published data appearing as "0 results"), not a visible crash.

This bit five separate admin routes (Results, FAQs, Web Stories, Video Academy) plus the homepage and several public detail pages before being caught — all from the same root cause, none of it visible in local testing.

**Decision:** Any file that calls `.populate('fieldName', ...)` must import the referenced model directly in that same file — even as a bare `import '@/app/models/Doctor';` side-effect import if nothing else in the file needs it by name. Never rely on another file in the same request having already imported it.

**Consequences:** A small, easy-to-forget tax on every new `.populate()` call site — but the alternative is a bug class that is invisible until it's already live in production. When adding a new populated ref, grep the target file's imports before assuming `next dev` passing means it's safe.
