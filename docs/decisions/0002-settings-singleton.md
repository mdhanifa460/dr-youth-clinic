# 0002 — `Settings` is a single document, not one per city/tenant

**Status:** Active

**Context:** DR Youth Clinic operates one brand across four cities (Chennai, Bangalore, Coimbatore, Kochi). Brand-level configuration (navigation, analytics IDs, AI toggles, clinic profile, booking rules) needs somewhere to live that the admin can edit without a deploy.

**Decision:** `Settings` is a singleton (`getSettings()` finds-or-creates exactly one document) — city/branch variation is handled as a *field* on content (`Service.location`, `Result.branch`, `Booking.location`), not as a separate configuration document per city. There is one navigation menu, one set of AI toggles, one analytics configuration for the whole platform.

**Consequences:** Adding a fifth city is a content change (add services/doctors tagged to that city), not a configuration migration — this is the right shape for one growing brand. It is explicitly *not* multi-tenant: there is no isolation boundary that would let a second, unrelated clinic brand run on this codebase without its own deploy and its own database. Do not try to bend this singleton into tenant-scoping under time pressure — if a genuine second-brand need ever arises, that's a deliberate re-architecture, not a Settings schema tweak.
