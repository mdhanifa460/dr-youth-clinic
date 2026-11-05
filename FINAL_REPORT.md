# DR Youth Clinics: Final Report

**Date:** 5 November 2026. **Base commit:** `515d178`.

**Status: not live.** All changes are uncommitted in the working copy on `main`. dryouthclinics.com is unchanged. A push to `main` deploys to production, so that needs the owner's go-ahead.

**Overall: about 7/10 against a 9/10 target.** The site is much more trustworthy and polished, but the target was **not reached**. The biggest gaps are a critical framework security upgrade, unverified clinic data, and LCP.

## Must be resolved before or soon after launch

### 1. Security: critical and still open (P0-06)
`npm audit` reports critical remote code execution advisories against Next.js 14.2.35, with no 14.x fix. The upgrade was **not attempted**. It moves to a new major version and React 19, with about 84 route files and 12 `cookies()`/`headers()` callers to review, so it should be tested separately from the redesign. Vercel hosting may reduce the exposure, but that is not confirmed.

### 2. Clinic data to confirm

| Item | Current state | Who |
|---|---|---|
| Each doctor's qualifications, title and registration number | Listed: M.Ch. Plastic Surgery; MBBS with cosmetology (2); BHMS with cosmetology; BHMS; BAMS, MD (Ayu), FFAC; BDS, FMC; MDS with cosmetology. Several bios say "Certified Cosmetologist", still shown | Clinic |
| Dr. Indhira Rajkamal | Title says "MD", qualifications say "MBBS, Cosmetology". Cards now show the qualifications | Clinic |
| Dr. Murali K | maynee.in names a Dr. Murali K with the same qualification as its co-founder. May or may not be the same person | Owner |
| Branch addresses | Chennai shows 600040 on the city page and 600 102 in the footer. Others look like placeholders | Clinic |
| Branch hours | Shown from `app/data/locations.ts` unless set in Admin. Booking slots and the booking sidebar always use that file | Clinic |
| Branch phones | The placeholder number was removed, so a branch with no Admin phone now shows no call link | Clinic |
| Free consultation | Live FAQ and About page offer it. The default consultation fee is ₹500 | Owner |
| Rewards programme | Points, discounts and referral benefits, with no programme page | Owner, legal |
| Treatment wording, including risks | Needs doctors' review | Doctors |

### 3. Decisions for the owner

- **"Dermatology" was removed from titles and metadata.** This could reduce search visibility for "dermatology clinic" terms. It was removed because no listed doctor shows a dermatology degree. If one does, the wording can return.
- **Vercel region:** live responses show `iad1` (US East) for an Indian audience. The right region depends on where the database runs.
- **CI database:** confirm the CI `MONGODB_URI` secret does not point to production.

## What changed

171 tracked files modified and 9 added (including this report), none deleted.

| Area | Change |
|---|---|
| Trust | Removed "10k+ procedures", FDA, NABH, ISO, IADVL, "best clinic", "painless", "proven" and limited-time wording. Copy saved in Admin is now filtered when pages render |
| Credentials | "Dermatologist" and "board-certified" wording replaced with "doctor". Doctor cards show listed qualifications. The AI chat's fixed FAQ source was also corrected |
| Figures | Invented doctor and treatment counts replaced with live ones. Zero-value offer counters hidden. Copyright year is automatic |
| Contact | Fixed `tel:` links. Removed the placeholder number and invented ratings |
| Booking | 3 steps, treatment first. Visible labels, slots based on branch hours, closed-day message, privacy notice, spam honeypot. "Request Appointment" replaces "Confirm Booking" |
| Design | Navy kept, with ivory, bronze and champagne tokens, serif headings, shared Button and SectionHeader, smaller radii, line icons in place of many emoji, compact header |
| Homepage | Static hero with real clinic photo, slimmer sections, no duplicate video section, 2-column doctors on phones |
| Treatment and doctor pages | Neutral trust copy, "Before you decide" note, labelled links |
| SEO | Removed the unsafe homepage canonical fallback, `noindex` on appointment lookup, schema built from displayed hours with the correct state, no fake ratings |
| Behaviour | Location prompt only on request. Nav highlights the correct page. Build survives a category read failure. Public `GET /api/booking` removed |

Three behaviour changes to know about:
- Saved copy that trips the filter disappears from the page without any warning in Admin.
- The homepage hero no longer rotates by itself.
- Global style tokens (corner radii and some colours) also reach Admin screens, which were not tested.

## Test results

Tested on the final code with a production build. Data came from an **in-memory stand-in built from public page content**, not the real database.

| Check | Baseline | Final |
|---|---|---|
| Type check | Pass | Pass |
| Unit tests | 624 passed | **634 passed** |
| ESLint | 2 errors, 399 warnings | **0 errors**, 399 warnings |
| Production build | Pass | Pass |
| Browser tests (Chrome, desktop and mobile) | Not run | **142 passed, 0 failed** |
| UI booking, submit double-tapped | Not run | 1 request, 1 saved booking, "We've received your request" |
| API: retry and honeypot | Not run | Retry recognised; spam reply sent and not saved |
| Layout at 360, 390, 430, 768, 1024, 1440px, 8 pages | 390 and 1440 only, 5 pages | No horizontal overflow, no hydration or page errors |

### Lighthouse (mobile, one run per page)

| Page | Before (production) | After (local) |
|---|---|---|
| Home | Perf 84, A11y 92, BP 71, SEO 100, LCP 3.9 s | Perf 78, A11y 100, BP 100, SEO 100, LCP 4.8 s |
| Chennai | Perf 89, A11y 92, BP 75, SEO 100, LCP 2.8 s | Perf 77, A11y 100, BP 100, SEO 100, LCP 4.6 s |
| Book | Perf 84, A11y 96, BP 75, SEO 100, LCP 3.2 s | Perf 84, A11y 100, BP 100, SEO 100, LCP 4.3 s |
| Doctors | Perf 82, A11y 92, BP 75, SEO 100, LCP 3.2 s | Perf 81, A11y 100, BP 100, SEO 100, LCP 4.3 s |

**These columns are not like for like.** Production has a CDN and third-party tags. The local run has neither, uses different data, and resizes images through a proxy. It is also noisy: Book scored 98 with a 2.2 s LCP in the previous run. Best-practices at 100 partly reflects the absence of tags.

**The 2.5 s LCP target has not been shown to be met, and the new serif font may have made it worse.** A lighter font did not visibly help. Re-measure on a Vercel preview before launch. If LCP is worse there, the first thing to test is the font's loading strategy.

### Not tested
Real database, real WhatsApp and CRM delivery, Admin screens, Lighthouse on a real deployment, field Core Web Vitals, Safari, the `visual.spec.ts` suite, and screen readers. `/lp` landing pages were changed, but no rendered landing page was checked.

### Known CI failures after this change
- **Visual regression:** the 24 stored snapshots predate the redesign, so that job should fail until they are regenerated on Linux CI.
- **`lint:check`:** 399 warnings against a limit of 248. This also failed before this work.

## Remaining issues

| ID | Issue |
|---|---|
| P0-06 | Next.js security upgrade |
| P0-07 | Verified addresses and hours |
| P1-12 | Vercel region |
| P1-16 | Rewards programme decision |
| P1-18 | Doctor registration number field: not added, because it also needs an Admin form and real values |
| P2-10 | Console error `a[c] is not a function` on production: cause not confirmed, needs GTM access. Not seen locally, where no tags run |
| P2-15 | Risks field per treatment: a general "Before you decide" note was added instead, because specifics need doctors' review |
| Data | AI chat knowledge saved in the database may still hold old wording |
| Design | Offers, blog, academy and About received tokens and copy fixes, not a full redesign. Location pages were restyled but not restructured |
| Dependencies | 8 other high-severity `npm audit` items and unused packages not addressed |

### Admin copy to edit
The filter hides these, but they should be corrected at source:
- Homepage hero badge ("best aesthetic clinic in India") and hero description ("natural, lasting results")
- Second hero slide ("world class technology", "instantly at ease")
- FAQ "Are your doctors certified dermatologists?" and "All treatments are performed by certified dermatologists"
- Why Choose list: "US FDA Endorsed Equipment", "Complete Patient Contentment", "Global Safety Regulations"
- About page: ISO, NABH, IADVL, FDA and "board-certified" text
- Web story titled "Untitled Story"
- Name capitals: "Dr. TEJASHWINI GR", "BUTT CORRECTION"
- Footer "© 2024" and public Gmail address

## Scorecard

Scores are engineering judgement, informed by the evidence shown.

| # | Category | Original | Final | Evidence |
|---|---|---|---|---|
| 1 | Visual design | 6 | 8 | Screenshots. Some inner pages only partly redesigned |
| 2 | Homepage UX | 6 | 8 | Clearer hero, shorter page. Height comparison uses different data |
| 3 | Treatment UX | 6 | 7 | Neutral copy, safety note. Tested on test content only |
| 4 | Doctor profiles | 5 | 7 | Qualifications visible. Credentials unverified, no registration number |
| 5 | Clinic locations | 5 | 6 | Correct schema and live counts. Addresses unverified |
| 6 | Appointment conversion | 6 | 8 | E2E passed, not yet measured with real patients or real notifications |
| 7 | Mobile responsiveness | 7 | 8 | No overflow at 6 widths in Chrome. Safari and real devices untested |
| 8 | Technical SEO | 8 | 9 | Metadata and schema tests. "Dermatology" terms removed |
| 9 | Local SEO | 4 | 5 | Hours and region fixed. Addresses still conflict |
| 10 | Performance | 7 | **NOT VERIFIED** | No comparable measurement |
| 11 | Accessibility | 8 | 9 | Lighthouse 100 on 4 pages. No screen-reader or full manual audit |
| 12 | Security | 4 | 4 | Honeypot added, critical advisories still open |
| 13 | Code quality | 7 | 8 | Lint errors fixed, tests added. 399 warnings remain |
| 14 | Brand trust | 3 | 7 | Unsupported claims removed from checked pages. Credentials need confirming |

## Manual verification needed

1. Deploy to a Vercel **preview** and re-run Lighthouse.
2. Submit one real test booking on the preview and confirm the staff alert, patient WhatsApp and CRM record. Delete it afterwards. Note that the patient template is still named `booking_confirmation_premium`: check it doesn't promise a confirmed slot.
3. Open the Homepage, Doctors and Locations screens in Admin, and save a change.
4. Review homepage and treatment pages with real content on an iPhone and an Android phone.
5. Have the doctors or legal adviser review the wording.
