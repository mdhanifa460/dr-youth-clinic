# Privacy Policy Audit

**Page:** https://dryouthclinics.com/privacy-policy. **Live text read:** 5 November 2026, "Last updated: August 2026". **Companion page:** `/terms`.

This is a technical and content audit for legal review. **It is not legal advice.** A qualified Indian lawyer should confirm every legal point, particularly the items marked *secondary source*.

## How the page works

The policy text is stored in the `LegalContent` database record and edited at **Admin → Legal**. That record stays the single source of truth. No duplicate page was created, and no live policy wording was changed. Only the page's presentation changed.

## 1. Legal position checked

| Rule | Position | Effect on the policy | Source |
|---|---|---|---|
| DPDP Act 2023 and Rules 2025 | Rules notified November 2025 and phased in. Core consent, notice and rights obligations start about **13 May 2027** (*secondary source; confirm against the Gazette*) | The policy says it is "aligned" with the Act now. Lawyer to confirm wording during the transition | [AZB](https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/), [Mondaq](https://www.mondaq.com/india/data-protection/1708164/digital-personal-data-protection-rules-2025-notified) |
| No "sensitive" category in the DPDP Act | The Act uses one definition of personal data | The policy's statement that the DPDPA "classifies" health data as sensitive appears wrong | [Taxmann](https://www.taxmann.com/post/blog/dpdp-act-vs-it-act), [IJME](https://ijme.in/wp-content/uploads/2023/12/Protecting-healtcare_149.pdf) |
| IT Act s.43A and SPDI Rules 2011 | Reported to continue until replaced when the Act fully commences (*secondary source*) | The sensitive-data concept may belong to these rules. Lawyer to confirm current duties, including any grievance officer requirement | [Linklaters](https://www.linklaters.com/en/insights/data-protected/data-protected---india) |
| DPDP Rule 14 | Publish how to make rights requests. Grievance response within a reasonable period, up to 90 days. People may nominate someone | No nomination right or stated grievance process beyond "write to us" | [Rule 14 text](https://dpdpa.com/dpdparules/rule14.html) |
| 2002 Ethics Regulations, cl. 1.3.1 and 1.3.2 | Indoor patient records for 3 years from start of treatment. Record requests met within 72 hours | See retention and rights findings below | [Regulation text](https://bnblegal.com/bareact/the-indian-medical-council-professional-conduct-etiquette-and-ethics-regulations-2002/) |
| 2002 Regulations, cl. 2.2 and 7.14 | Patient confidences protected, with limited exceptions | Policy has no confidentiality section | Same as above |
| 2002 Regulations, cl. 7.17 | No publishing identifiable patient photos or case reports without permission | Publication needs its own explanation | Same as above |
| 2023 RMP Regulations | Held in abeyance by the August 2023 notification, keeping the 2002 Regulations in effect. Later changes not checked | Lawyer to confirm the current position | [Medical Dialogues](https://medicaldialogues.in/health-news/nmc/breaking-news-nmc-puts-its-controversial-registered-medical-practitioner-professional-conduct-regulations-2023-put-on-hold-116314) |
| NMC public notice, 6 October 2026 | Reported: patient consent "shall not, by itself, make permissible" testimonials, promotional stories or before-and-after depictions. Required consent must be specific, informed, voluntary, documented and verifiable | Conflicts with the Terms' marketing wording. **The official notice was not read; exceptions are not known** | [Medical Dialogues](https://medicaldialogues.in/health-news/nmc/what-do-nmc-ethical-advertising-guidelines-say-about-patient-privacy-and-consent-181171), [summary](https://medicaldialogues.in/health-news/nmc/nmc-issues-ethical-advertising-public-communication-guidelines-for-doctors-hospitals-details-180731) |

**Not checked:** state clinical establishment rules in Tamil Nadu, Karnataka and Kerala, which may set different record periods.

## 2. Inconsistencies

### Contact details

| Item | Where | Value |
|---|---|---|
| Email | Privacy Policy and Terms | dryouthchennai@gmail.com |
| Email | Site header and footer | dryouthclinic2021@gmail.com |
| Email | Code default for a new database | hello@dryouthclinic.com (a different domain from the site) |
| Phone | Privacy Policy and Terms | 9043302224 |
| Phone | Site header | 99944 49535 |
| Address | Privacy Policy and footer | Anna Nagar East, Chennai 600 102 |
| Address | Chennai page and schema | Anna Nagar, Chennai 600040 |
| Privacy contact | Privacy Policy | Chennai only, though it covers 4 cities. No named privacy or grievance contact |

### Retention

| # | Finding | Detail |
|---|---|---|
| R1 | Start date differs | Policy: 3 years "from your last visit". Clause 1.3.1: from the start of treatment |
| R2 | Scope differs | Clause 1.3.1 covers indoor patients. The policy applies it to all consultation records. It may well be a sensible choice, but the stated basis needs confirming |
| R3 | No upper limit | "Minimum of 3 years" gives no maximum for treatment records or photographs |
| R4 | **Promise not enforced by the website code** | The policy says enquiry data is kept up to 12 months and then deleted or anonymised. See the code check in section 3 |
| R5 | Types with no period | Communication records (WhatsApp, calls), published images, AI chat conversations, session recordings |
| R6 | Vague periods | Payment records and analytics refer to other rules with no stated duration |

### Policy against Terms

| # | Policy | Terms | Issue |
|---|---|---|---|
| T1 | Photos used for diagnosis and progress | Photos for "clinical records, training, or marketing" under one consent | Combines separate purposes. Conflicts with the reported NMC notice |
| T2 | Marketing only with consent | Sharing contact details authorises contact by phone, SMS, WhatsApp or email | Different consent standard |
| T3 | Rights handled within 7 working days | Published images removed within 7 business days | Separate commitments. Check clinic can meet them |
| T4 | Not addressed | Patient social posts reposted "unless you'd prefer we didn't" | Opt-out, and may count as a testimonial under the NMC notice |

## 3. Content findings

| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| PP-01 | High | "The DPDPA classifies this as sensitive personal data" appears inaccurate | Lawyer to correct |
| PP-02 | High | No informed consent section | Draft provided below |
| PP-03 | High | Clinical photography and external publication are not separated | Draft provided below |
| PP-04 | High | No confidentiality or security section | Draft provided. Only website controls confirmed in code are stated |
| PP-05 | High | **Tools running but not disclosed.** Microsoft Clarity was seen loading on the live site. Code can also load Hotjar, and bookings send the visitor's IP to ip-api.com. AI providers handle chat and assessments, and a CRM can receive bookings | Clinic to confirm what is active, then disclose |
| PP-06 | High | Policy says health data isn't passed to advertisers, while Meta Pixel can run on treatment pages. A page address can suggest a health interest | Lawyer and marketing to review |
| PP-07 | Medium | "By using our website… you're agreeing" may fall short of DPDP consent standards | Lawyer to review |
| PP-08 | Medium | No nomination right or children's data section | Lawyer to review for 2027 readiness |
| PP-09 | Medium | "7 working days" for all requests, while clause 1.3.2 sets 72 hours for medical records | Lawyer to reconcile |
| PP-10 | Medium | Policy mentions a payment gateway partner. None is visible in the code, and the Terms list in-clinic methods | Clinic to confirm |
| PP-11 | Low | "Last updated: August 2026" predates the NMC notice | Update after review |

**Code check for R4:** no automatic expiry index was found on the Booking, Lead, LandingPageLead, Conversation or PatientJourney models. The only scheduled jobs handle notifications and CRM sync, so no automatic deletion job exists for those records. Staff may delete manually: the clinic should confirm.

## 4. Presentation findings (fixed)

| ID | Finding | Fix |
|---|---|---|
| UX-1 | Emoji icons, large cards, low-contrast hero text | Line icons, restrained cards, readable contrast |
| UX-2 | No overview or navigation on a long legal page | Four-card overview and a section list |
| UX-3 | List styling relied on a Tailwind plugin not installed, so spacing was inconsistent | Explicit, tested styles |
| UX-4 | Rights instructions were one line inside a section | Clear "How to make a request" panel |
| UX-5 | Risk of long emails overflowing on phones | Text wrapping, checked at 6 widths |

## 5. Draft sections: not published

Three drafts are in `app/lib/legalDraftSections.ts`:
1. Informed consent
2. Clinical photographs and external publication
3. Confidentiality and data security

They appear only as **insert buttons in Admin → Legal**, and the public page refuses to show any section that still has a `[TO CONFIRM: …]` marker.

**To publish:** lawyer reviews the draft, clinic resolves each marker, then Admin inserts, removes the markers, updates "Last updated" and saves.

Security statements in the draft are limited to controls confirmed in code: enforced HTTPS, staff logins with role permissions, optional two-step login and a staff activity log. Everything else, such as paper records, backups, staff training and breach handling, is left as a marker. Nothing has been assumed.

## 6. Actions needed

| Who | Action |
|---|---|
| Lawyer | Review sections 1–3 and the three drafts. Read the official NMC notice |
| Owner | Choose one privacy email and phone, and name a contact |
| Clinic | Confirm active tools, retention practice, consent process and security practices |
| Marketing | Stop relying on consent alone for promotional patient content until the lawyer advises. Reviews and results remain hidden by the existing switch |
| Developer | Build retention deletion once the periods are agreed |
