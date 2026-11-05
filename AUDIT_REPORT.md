# DR Youth Clinics: Website Audit Report

**Audit date:** 4 November 2026. **Code audited:** commit `515d178` on `main`. **Live site:** https://dryouthclinics.com

## How this was measured

| Evidence | Method | Limits |
|---|---|---|
| Rendered HTML, metadata, schema, contact links | Fetched 25 live URLs and parsed the HTML | Single snapshot, taken about 23:15 IST |
| Layout, overflow, console errors | Real Chrome through Playwright at 390px and 1440px | Five key pages only |
| Lighthouse | Mobile preset, one run per page, on production | Through a corporate proxy. These are lab scores, not field Core Web Vitals |
| Type check, unit tests, lint, build | Run locally with a portable Node 22 (CI uses Node 20) | The build used an in-memory stand-in for MongoDB, built from public page data |
| Competitor | maynee.in home, one treatment, booking and doctor page, plus Lighthouse | Their claims were not checked for accuracy |

**Not verified:** field Core Web Vitals (needs Search Console or CrUX access), the production database contents beyond what pages expose, Admin-only screens, real WhatsApp and CRM delivery.

## 1. Executive summary

The engineering base is stronger than the site's appearance suggests. All 624 unit tests pass, types are clean, and booking already has rate limiting, duplicate protection and validation. No page overflowed horizontally.

The serious problems are **trust and security**, not code structure:

1. **Doctor credentials are overstated.** The site says "our dermatologists", "certified dermatologists" and "board-certified dermatologist". The qualifications it lists for its own 8 doctors show no dermatology degree (see section 4, P0-01).
2. **Unsupported claims are still live**, including "10k+ Successful Procedures", "US FDA Endorsed Equipment" and "best aesthetic clinic in India". This is despite recent clean-up work for the NMC guidelines.
3. **The framework has critical published vulnerabilities.** `npm audit` reports critical remote code execution advisories against Next.js 14.2.35, with no fix on the 14.x line.
4. **Branch details conflict.** Chennai shows two different addresses, and the code contains a placeholder phone number and made-up review counts as fallbacks.
5. **Booking language promises too much.** A request saved with status `new` is presented as "Confirm Booking" and "Booking Confirmed".

The design is clean but generic: crowded, emoji-led, and very long on mobile (18,548px for the homepage).

## 2. Existing project architecture

| Area | Finding |
|---|---|
| Framework | Next.js 14.2.35, App Router, React 18.2, TypeScript 5.4 |
| Styling | Tailwind 3.4 with a small token set, but most colours are hard-coded hex values. 139 public files use raw `#0B2560` or `#f6faff` |
| Fonts | Inter and Manrope through `next/font` (self-hosted) |
| Data | MongoDB through Mongoose, ISR plus `unstable_cache`. Most homepage copy is edited in Admin and stored in the database |
| Images | Cloudinary through `next/image`, with focal-point support |
| Public routes | Home, `/[city]` (4 cities), services hub, category and detail pages, doctors, book, offers, about, blog, academy, FAQs, web stories, plan-my-journey, skin-quiz, legal, `/lp/[slug]` |
| Booking | `POST /api/booking`: rate limit, Zod validation, idempotency key, capacity check, CRM push, WhatsApp alerts |
| Deployment | Vercel, auto-deploys on push to `main`. Live responses show function region `iad1` (US East) serving an Indian audience |
| CI | Lint, types, unit tests, build, E2E, visual regression and Lighthouse. **The E2E and build jobs use the `MONGODB_URI` secret** |

### Baseline results (before any change)

| Check | Result |
|---|---|
| `tsc --noEmit` | Pass, 0 errors |
| `vitest run` | Pass, 62 files, 624 tests |
| `eslint .` | **Fail**: 2 errors, 399 warnings. `lint:check` allows 248 warnings, so it fails as well |
| `next build` | Pass with the data stand-in. **Fails with no database**, because `getCachedCategories` has no error handling |
| `npm audit --omit=dev` | **1 critical, 8 high, 4 moderate** |

### Lighthouse (mobile, production)

| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Home | 84 | 92 | 71 | 100 | 3.9 s | 0 | 200 ms |
| Chennai | 89 | 92 | 75 | 100 | 2.8 s | 0 | 290 ms |
| Book | 84 | 96 | 75 | 100 | 3.2 s | 0.1 | 290 ms |
| Doctors | 82 | 92 | 75 | 100 | 3.2 s | 0.1 | 340 ms |
| maynee.in home | 29 | 89 | 79 | 100 | 13.9 s | 0 | 1,830 ms |

All four DR Youth pages miss the 2.5 s LCP target in this lab test.

## 3. Current strengths

- Booking back end: rate limiting, idempotency, capacity rules, attribution.
- `app/lib/patientClaims.ts`: a render-time filter for claims typed into Admin. This is the right pattern to extend.
- One switch (`showBeforeAfterOnPublic`) hides reviews and results until legal approval.
- Unique titles, descriptions and canonicals on most routes, a sitemap, robots rules, and per-city SEO fields.
- Good security headers (CSP, HSTS, frame and content-type protection).
- CLS is low and no key page overflows horizontally.
- Faster and lighter than the competitor by a wide margin.

## 4. Critical problems (P0)

| ID | Category | Description | File/path | Business impact | Recommended fix | Verification |
|---|---|---|---|---|---|---|
| P0-01 | Trust, medical | Pages say "our dermatologists", "certified dermatologists" and "board-certified dermatologist". Listed qualifications are: M.Ch. Plastic Surgery; MBBS with cosmetology (2); BHMS with cosmetology; BAMS, MD (Ayu), FFAC; BHMS; BDS, FMC; MDS with cosmetology. Dr. Indhira Rajkamal is also titled "MD" while the qualifications field says "MBBS, Cosmetology" | Admin FAQs; `HeroSection`, `[location]/page.tsx`, service pages, `book/`, metadata, `rag/staticFaqs.ts` | Patients could be misled about who treats them. Regulatory and legal exposure | Use "doctors" everywhere in code. Filter saved copy at render time. Owner confirms credentials | Search rendered HTML for the terms |
| P0-02 | Trust | Hard-coded "10k+ Successful Procedures Completed" on the hero image | `HeroSection.tsx:228` | No source, and the NMC guidance noted in the repo bars patient-count style advertising | Remove | Rendered HTML |
| P0-03 | Trust | "FDA-approved", "US FDA Endorsed", "FDA Cleared" with no evidence per device | Hero, `book/page.tsx`, `Sidebar.tsx`, `[location]/page.tsx`, service page, LP sections, defaults, Admin data | Unverifiable regulatory claim | Remove from code, filter from saved copy | Rendered HTML |
| P0-04 | Trust | LP default seals "NABH Certified", "ISO 9001:2015", "FDA Cleared", "IADVL Member" appear unless overridden | `lp/sections/GuaranteeSection.tsx:20` | Accreditation claims with no evidence in the repo | Remove defaults, show only seals an admin entered | Unit test, code review |
| P0-05 | Trust | "best aesthetic clinic in India", "best aesthetic clinics", "Complete Patient Contentment", "Trusted by thousands", "10K+ subscribers", "virtually painless", "Safe for All Skin Types", "proven results" | Hero, `VideoReelsSection.tsx:189`, `HomepageLocations.tsx:406`, defaults, Admin data | Superlatives and outcome promises in medical advertising | Remove from code, filter saved copy, list for Admin editing | Rendered HTML |
| P0-06 | Security | Next.js 14.2.35 has critical advisories, including unauthenticated RCE in the image optimisation API and several high-severity denial of service and SSRF issues. No 14.x fix is listed | `package.json` | Possible server compromise. Vercel hosting may reduce exposure to some issues, but this is **not confirmed** | Dedicated upgrade to a patched major version, tested separately from the redesign | `npm audit`, full test run |
| P0-07 | Contact, data | Chennai has two addresses: "Anna Nagar, 600040" (city page, booking, schema) and "JP Anupam Tower, Anna Nagar East, 600 102" (footer). The Bangalore, Kochi and Coimbatore addresses look like generic placeholders | `app/data/locations.ts`, Admin footer | Patients may travel to the wrong place. Weakens local SEO | **Owner confirms.** Enter in Admin → Locations | Rendered pages and schema |
| P0-08 | Data | Placeholder `+919876543210` for every branch, plus made-up `rating` and `reviewCount` (for example 4.9 and 412) as fallbacks | `app/data/locations.ts` | A placeholder number appears if a branch's Admin phone is ever blank | Remove them, hide phone links when no number exists | Unit test |
| P0-09 | Conversion, trust | "Confirm Booking" and page title "Booking Confirmed", although the saved status is `new` and staff still have to follow up. Sidebar promises "WhatsApp confirmation within minutes" | `book/Form.tsx`, `Sidebar.tsx`, `book/success/page.tsx` | False expectation of a held slot | "Request appointment", plus clear "we will call to confirm" wording | E2E test |

## 5. High-priority problems (P1)

| ID | Category | Description | File/path | Business impact | Recommended fix | Verification |
|---|---|---|---|---|---|---|
| P1-01 | Trust | "20+ Expert Doctors" and "50+ Treatments" conflict with 8 doctors listed and 84 active treatments counted on the same page. City cards show invented counts (6 doctors) against live ones (4) | `HomepageLocations.tsx`, `locations.ts` | Visible contradiction | Use live counts only | Rendered HTML |
| P1-02 | Conversion | Location permission prompt fires on load, twice over, before any action | `HomepageLocations.tsx`, `DoctorsSection.tsx` | Reduces trust, and Lighthouse flags it | Only ask on a "Use my location" click | Browser test |
| P1-03 | Conversion | Broken link format `tel:99944 49535` from saved data | `CTAStrip.tsx` | Calls may fail on some devices | Normalise every `tel:` link | Rendered HTML |
| P1-04 | Conversion | Booking asks for a free-text concern first and 4 steps overall. Fixed time slots ignore branch hours. Labels are hidden. No consent or privacy text | `book/Form.tsx` | Drop-off, especially on mobile | Treatment and clinic first, optional concern, branch-aware slots, visible labels, privacy notice | E2E test |
| P1-05 | Accuracy | Sidebar says "Sunday: By Appointment", branch data says "Closed". The same phone is listed for all 4 cities, though each branch has its own | `book/Sidebar.tsx` | Wasted calls and visits | Read from branch data | Rendered HTML |
| P1-06 | Local SEO | Schema hard-codes 09:00–19:00 for every branch, though Bangalore shows 10–6. `addressRegion` holds the city. `priceRange` is "$$" | `SchemaMarkup.tsx` | Search engines receive wrong hours | Build schema from displayed hours and real state | Parse JSON-LD |
| P1-07 | SEO | Root metadata sets a homepage canonical on any page lacking its own. `/my-appointments` is indexable, uses the default title, and canonicalises to the homepage | `app/layout.tsx`, `my-appointments` | Personal lookup page indexed | Remove the root canonical, add `noindex` | Rendered HTML |
| P1-08 | Compliance | `/offers` metadata still says "Limited-time deals… Save up to 50%". Removed hero slides carry the same wording | `offers/page.tsx`, `HeroSection.tsx` | Conflicts with recent compliance work | Neutral wording | Rendered HTML |
| P1-09 | UX, a11y | Auto-rotating hero with no reduced-motion handling. Its hidden slides carry the worst claims | `HeroSection.tsx` | WCAG 2.2.2 issue, hurts LCP | Single static hero unless Admin sets several slides | Browser test |
| P1-10 | UX | Mobile homepage is 18,548px tall, and a category page 27,716px | Homepage sections | Patients must scroll a long way to find the basics | Tighter sections, less duplication | Measured height |
| P1-11 | Performance | Homepage HTML is about 390 KB, because full doctor, video and story records are sent to the browser | `app/(public)/page.tsx` | Slower LCP on mobile networks | Select only needed fields | HTML size |
| P1-12 | Performance | Live responses show region `iad1`. One uncached homepage fetch took 13 s | Vercel settings | Slow for Indian patients | **Owner decision:** depends on the database region | Response header |
| P1-13 | Lint, reliability | `useBranchWhatsApp` is called conditionally, breaking the rules of hooks | `UnifiedJourneyResults.tsx:351` | Possible crash on results screen | Move the hook above the return | ESLint |
| P1-14 | Reliability | The build fails entirely if categories cannot be read | `getCachedCategories.ts` | Failed deploys on a database blip, which the repo notes have happened | Fall back to defaults on read failure | Build with no database |
| P1-15 | Trust, data | Published web story titled "Untitled Story". Inconsistent capitals: "Dr. TEJASHWINI GR", "BUTT CORRECTION" | Admin data | Looks unfinished | Filter the story, list the rest for Admin | Rendered HTML |
| P1-16 | Compliance | "DR Youth Rewards" lists points, discounts and referral benefits, with no programme page. Referral incentives may raise NMC questions | Admin data | Possible unsupported offer | **Owner or legal decision** | n/a |
| P1-17 | CI, data safety | E2E jobs run against whatever `MONGODB_URI` secret holds. If that is production, tests read and could write live data | `.github/workflows/ci.yml` | Test data mixed with patient data | **Owner confirms** the secret points to a test database | n/a |
| P1-18 | Doctors | Qualification data conflicts with titles (P0-01). No registration number field exists | `models/Doctor.ts`, Admin | Credential display cannot be complete | Add optional field. **Owner supplies values** | Rendered page |

## 6. Medium-priority problems (P2)

| ID | Category | Description | File/path | Impact | Recommended fix | Verification |
|---|---|---|---|---|---|---|
| P2-01 | Design | Most colours are hard-coded, with no shared button, card or section components | Across `app/` | Inconsistent look, slow to change | Tokens and shared UI primitives | Code review |
| P2-02 | Design | Emoji used as icons in hero, categories, booking and facts | Various | Looks informal for a medical brand | Line icons, or none | Screenshots |
| P2-03 | Brand | Same font pair and blue as many clinics, heavy weights, large rounded cards throughout | `layout.tsx`, `globals.css` | Generic feel | Refined type and calmer surfaces | Screenshots |
| P2-04 | HTML | Two nested `<main>` elements on most pages | Root layout and 26 pages | Screen-reader landmark error | One `<main>` only | Browser count |
| P2-05 | A11y | Colour contrast fails on all pages audited. White on amber in the mobile bar. Bronze text on navy | `MobileStickyBar.tsx`, others | Hard to read | Fix pairings | Lighthouse |
| P2-06 | A11y | Small tap targets, unlabelled doctor LinkedIn link, placeholder-only inputs in the quick form | `DoctorCard.tsx`, `ConsultationFormBar.tsx` | Harder on mobile and for screen readers | Labels and 44px targets | Lighthouse |
| P2-07 | SEO | Headings lose spaces ("Skin & HairAcademy", "ClinicalExcellence."). `/skin-quiz` has no H1. 4 homepage images have no alt text | Various | Weak headings | Fix markup | HTML parse |
| P2-08 | Content | Footer shows "© 2024" from saved data. "Bangalore" and "Bengaluru" are mixed | Footer, Admin | Looks unmaintained | Compute the year. Use one name | Rendered HTML |
| P2-09 | Bug | Open or closed status is calculated at render in a cached page | `HomepageLocations.tsx` | Can show stale status, hydration mismatch | Calculate after mount | Browser console |
| P2-10 | Console | `Uncaught TypeError: a[c] is not a function` on every page, and Clarity's `c.bing.com` pixel blocked by CSP. Cause not yet confirmed; only seen with third-party tags running | Tag scripts | Lowers best-practices score | Investigate the GTM container (needs access), allow the pixel host | Browser console |
| P2-11 | Lint | 399 warnings against a limit of 248, so `lint:check` already fails | Across repo | CI lint job cannot pass | Reduce, or reset the limit deliberately | ESLint |
| P2-12 | Security | `GET /api/booking` returns a public "API working" message | `api/booking/route.ts` | Minor information exposure | Remove | Request test |
| P2-13 | Spam | No honeypot on public booking forms | `api/booking/route.ts` | Spam reaches staff | Add a honeypot, keep rate limiting | API test |
| P2-14 | Tests | Visual snapshots become outdated after any redesign | `tests/e2e/visual.spec.ts-snapshots` | CI visual job fails until they are regenerated | Regenerate on Linux CI | CI |
| P2-15 | Treatment pages | Fixed "Why choose" points repeat unsupported claims. No space for risks and limitations | `services/[category]/[slug]/page.tsx`, `models/Service.ts` | Weak medical balance | Neutral copy, optional field for clinician-approved risks | Rendered page |

## 7. Low-priority problems (P3)

| ID | Category | Description | File/path | Recommended fix |
|---|---|---|---|---|
| P3-01 | Trust | Public email is a Gmail address | Admin data | Domain email, owner decision |
| P3-02 | Dependencies | Possibly unused or overlapping: `@tailwindcss/vite`, `@tailwindcss/postcss`, `@types/mongoose`, `lottie-react`, `@rive-app/react-canvas`, two icon libraries | `package.json` | Check usage, remove later in a separate change |
| P3-03 | Code | Duplicated geolocation helpers | `HomepageLocations.tsx`, `DoctorsSection.tsx` | Shared helper |
| P3-04 | Copy | Default footer and CTA defaults contain an old `1800 890 9669` number | `homepageDefaults.ts` | Replace with Admin values |
| P3-05 | Tooling | `caniuse-lite` data is 7 months old | Lockfile | Update with the dependency work |

## 8. SEO issues

Covered by P1-06, P1-07, P1-08, P2-07 and P0-07.

| Check | Status |
|---|---|
| Unique titles and descriptions | Good on all checked routes except `/my-appointments` |
| Canonicals and `metadataBase` | Present. Root fallback is unsafe (P1-07) |
| robots.txt and sitemap.xml | Present, and `/admin` and `/api` are blocked |
| 404 handling | Real 404 status with `noindex`, but it inherits the homepage canonical |
| Rendered content | Main content is in server HTML, so crawlers can read it |
| Schema | `MedicalClinic` and `FAQPage` present. No fake ratings in output. Hours and region wrong (P1-06). `Physician` and breadcrumbs need checking per page |
| Local pages | 4 city pages exist, but share a template and placeholder addresses (P0-07) |

## 9. Performance issues

P1-10, P1-11, P1-12 and about 215–314 KiB of unused JavaScript per page. Fonts are already self-hosted. Heavy client-side sections (video reels, carousels, chat widget) are the main candidates to defer.

## 10. Accessibility issues

P1-09, P2-04, P2-05, P2-06 and P2-07. Lighthouse failures on production: `color-contrast` (all four pages), `target-size` (home, Chennai), `link-name` (doctors), `image-redundant-alt` (home).

## 11. Conversion issues

P0-09, P1-02, P1-03, P1-04, P1-05 and P1-10. On the positive side, WhatsApp, call and book are always reachable on mobile, and branch-aware numbers already work.

## 12. Competitor comparison: maynee.in

Used only as a design and business benchmark. Maynee's claims were not verified and should not be assumed accurate.

**Please check:** Maynee's site names "Dr. Murali K, M.Ch. (Plastic Surgery)" as its co-founder. DR Youth lists a Dr. Murali K with the same qualification. They may or may not be the same person. Only the owner can confirm this.

| Area | Maynee does better | DR Youth today | DR Youth should improve | Do not copy | Recommended implementation |
|---|---|---|---|---|---|
| Homepage structure | Very clear service, proof, then location flow | Many sections, repeated content | Shorter, clearer order | Long proof tickers | Reorder through existing Admin sections |
| Branding | Consistent blue identity | Navy and amber, mixed with emoji | Calmer and more distinctive | Generic clinic blue | Navy, ivory and restrained bronze |
| Typography | Clean, consistent sans-serif | Heavy Manrope headings | Add refinement | Same fonts | Serif display headings with Inter body |
| Colour | Few colours | Many one-off hex values | Use tokens | Their palette | CSS tokens |
| Hero | States city list and services at once | Vague line, promo badge | Say what, where, and how to book | Stats and superlatives | Static hero with real clinic photo |
| Treatment catalogue | Deep, browsable menu | 84 treatments, good mega menu | Better naming and grouping | Unreviewed medical terms | Keep the menu, tidy category cards |
| Treatment pages | "Quick answer", cost, suitability, branches | Rich but very long | Add quick summary and available clinics | "Real results" claims, before-and-after by default | Summary block and clinic links |
| Doctor profiles | Dedicated education section | Basic cards, good data fields | Show qualifications clearly | Marketing bios | Show qualifications on cards and profile |
| Testimonials | Prominent | Hidden pending legal review | Keep hidden until approved | Review schema, satisfaction figures | Keep the existing switch |
| Booking | Simple single form | 4 steps with free-text first | Reduce friction | Omitting date and clinic logic | 3 steps, treatment first |
| Mobile | Standard WordPress layout | Sticky action bar is better | Shorter pages | Their page weight | Keep the sticky bar, fix contrast |
| SEO | Per-branch pages, FAQ, breadcrumb schema | Good base, wrong local data | Correct local data | `AggregateRating` and `Review` markup without proof | Fix schema from real data |
| Performance | Nothing measured better | Perf 82–89, against 29 | Keep this lead | WordPress plugin load (about 10 MB) | Trim payload |
| Trust signals | Prominent numbers | Numbers removed for compliance | Use checkable facts: doctors, qualifications, branches | "20K+", "99% Satisfaction", "FDA Approved", "4.9★" | Live counts and qualifications |
| Content quality | Direct answers to patient questions | Good blog, some promotional copy | Plain language and balance | Outcome promises | Neutral copy and clinician review |

## 13. Recommended design direction

**"Quiet clinical confidence."** Keep DR Youth's navy so the brand stays recognisable. Replace pale blue backgrounds with warm ivory, and reduce amber to a restrained bronze accent. Use serif display headings over Inter body text. Use thin borders instead of heavy shadows, smaller corner radii, line icons instead of emoji, and real clinic photography. Keep motion minimal and honour reduced-motion settings.

Credibility should come from checkable facts: named doctors, listed qualifications, branch details and consultation-led wording.

## 14. Implementation roadmap

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
