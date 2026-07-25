# 0004 — AI-generated content is never auto-published

**Status:** Active — permanent principle

**Context:** The platform generates content with AI in several places (video summaries, FAQ suggestions, blog drafts, story drafts, SEO metadata). It would be technically straightforward to have any of these publish directly — paste a URL, get a live page.

**Decision:** Every AI-generation feature writes to a draft state (`Blog.active: false`, `Story.status: 'draft'`, or returns text to a form the admin must still explicitly save) and requires an explicit admin publish action. This applies uniformly across every content type and is not a per-feature choice to revisit — it's a standing platform rule.

**Consequences:** Slower time-to-publish than full automation, by design. In exchange: no AI hallucination, tone mismatch, or clinical inaccuracy ever reaches a patient without a human clinic staff member reading it first — non-negotiable for a healthcare business. Any *future* AI feature (booking triage, review-response drafting, anything else) inherits this rule by default; making something auto-publish is a deliberate exception that needs its own explicit sign-off, not the default path.
