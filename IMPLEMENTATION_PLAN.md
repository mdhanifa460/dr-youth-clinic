# DR Youth Clinics: Implementation Plan

Issue IDs refer to [AUDIT_REPORT.md](AUDIT_REPORT.md).

## Ground rules

- No invented clinic data, statistics, credentials, reviews or medical claims.
- Existing routes, Admin editing and booking APIs keep working.
- Reviews and results stay behind `showBeforeAfterOnPublic` until legal approves.
- Nothing is committed, pushed or deployed without the owner asking. A push to `main` goes straight to production.
- Every phase ends with type check, unit tests and, where relevant, a build and browser check.

## Phases

| # | Phase | Scope | Issues |
|---|---|---|---|
| 1 | Critical trust fixes | Extend the render-time claims filter; remove unsupported claims; placeholder data; enquiry wording | P0-01 to P0-05, P0-08, P0-09, P1-01, P1-08, P1-15 |
| 2 | Business and conversion | Location prompt on request; `tel:` links; branch hours and phones; schema; canonical; lint errors; build resilience | P1-02, P1-03, P1-05, P1-06, P1-07, P1-13, P1-14, P2-08, P2-09, P2-12, P2-13 |
| 3 | Design system | Tokens, type, shared Button, Section and Card components, header, footer, mobile bar | P2-01, P2-02, P2-03, P2-05 |
| 4 | Homepage | Static hero, trust row, categories, doctors, locations, FAQ, and payload trimming | P1-09, P1-10, P1-11 |
| 5 | Treatment and doctor pages | Neutral trust copy, summary, clinic links, qualifications, optional registration and risks fields | P2-15, P1-18 |
| 6 | Appointment flow | Treatment-first flow, branch-aware slots, visible labels, privacy notice | P1-04 |
| 7 | SEO | Heading fixes, alt text, schema per page, `noindex` where needed | P2-07 |
| 8 | Performance | Field selection, deferred client sections, measured result | P1-11 |
| 9 | Accessibility | One `<main>`, contrast, labels, targets, reduced motion | P2-04, P2-05, P2-06 |
| 10 | Final QA | Lint, types, tests, build, browser checks at 6 widths, `FINAL_REPORT.md` | All |
| Separate | Next.js security upgrade | Dedicated, separately tested change, not mixed with the redesign | P0-06 |

## Needs the owner, clinic or legal team

| Item | Needed from | Issue |
|---|---|---|
| Confirm each doctor's qualifications, title and registration number | Clinic | P0-01, P1-18 |
| Confirm exact address, phone and hours for all 4 branches | Clinic | P0-07 |
| Approve the Next.js upgrade and how to release it | Owner | P0-06 |
| Whether the Dr. Murali K listed by Maynee is the same doctor | Owner | Section 12 |
| Rewards programme: real, and permitted? | Owner, legal | P1-16 |
| Is the first consultation free? Live FAQ and settings need to agree | Owner | Phase 1 |
| Device evidence, if FDA or similar wording is wanted back | Clinic | P0-03 |
| Accreditations, if any should be displayed | Clinic | P0-04 |
| Vercel region, based on where the database runs | Owner | P1-12 |
| Whether CI's `MONGODB_URI` secret points to production | Owner | P1-17 |
| Access to the GTM container, to trace the console error | Owner | P2-10 |
| Medical review of treatment content, including risks | Doctors | P2-15 |
