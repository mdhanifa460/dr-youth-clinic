---
name: deploy-and-verify
description: The full verify-commit-deploy routine for dr-youth-clinic — typecheck, unit tests, Playwright regression, commit, push, then a single watched Vercel production deploy. Use whenever shipping a change to this repo, or when the user says "deploy", "ship this", or "run the usual checks".
---

# Deploy and Verify — dr-youth-clinic

This project's standing rule: **never mark a change done until it has
been verified end-to-end against real data and deployed to production.**
Code review alone has missed real bugs in this repo before (a booking-form
validation regression, a chart height bug, dead settings fields, a feature
silently gated off) — every one of those was only caught by actually
exercising the code with real requests, not by reading the diff.

## 1. Typecheck

```bash
./node_modules/.bin/tsc --noEmit
```

Must produce zero output. Do not use `npx tsc` — `npx` occasionally
resolves a different/global TypeScript version; the local binary is the
one that matches this project's `tsconfig.json`.

## 2. Unit tests

```bash
npx vitest run
```

Expect all files/tests passing (currently 7 files / 46 tests — treat any
drop from that as a regression to investigate, not ignore).

## 3. Real end-to-end verification

Pure unit tests don't catch integration bugs (a field that doesn't
persist, a flag that gates the wrong thing, a resolver that never sees
the data it's supposed to prefer). Before every deploy, exercise the
actual change with real data:

- If it touches an admin-editable Settings field: log in
  (`POST /api/admin/login` with `ADMIN_EMAIL`/`ADMIN_PASSWORD` from
  `.env.local` — note the field names are `email`/`password`, not
  `email`/`pass`), `GET`/`PUT` `/api/admin/settings` with real test
  values, confirm they round-trip, then **restore the original values**
  before moving on. Never leave test data sitting in the live document.
- If it touches a Mongoose schema (`app/models/*.ts`): **restart the dev
  server** before testing. `mongoose.models.X || mongoose.model(...)`
  means a long-lived `next dev` process keeps reusing the schema that
  was registered before your edit — a new field will silently not
  persist until the process restarts. This has caused a false "it's
  broken" investigation in this repo before.
- If it touches a public page: run the Playwright regression —
  `npm run test:e2e` (or `npm run test:visual` for the visual-only
  suite) — and separately sanity-check the specific page(s) affected at
  a few viewports if it's a layout change.
- Clean up: delete any scratch test files under
  `/private/tmp/.../scratchpad/`, remove any temporary `.test.ts` files
  you added under `tests/unit/` or `tests/api/` (vitest only picks up
  `tests/unit/**` and `tests/api/**` — a temp test file placed elsewhere
  silently won't run), and restore any DB documents you modified for
  testing.

## 4. Commit

Stage only the files that actually changed for this task (never
`git add -A`/`git add .` blindly — this repo's working tree can have
unrelated in-progress files). Write a commit message that explains
*why*, not just what — see recent `git log` for this repo's style.

## 5. Push and deploy — one at a time, watched to completion

```bash
git push origin main
vercel --prod --yes
```

**Run the deploy in the background and wait for its actual completion
notification before doing anything else** — including before starting
a second deploy. This repo has a real incident from doing otherwise:
firing multiple `vercel --prod --yes` calls back-to-back queued them,
and a stale (older-commit) queued deployment sat behind a newer
"Building" one — a real risk of rolling production back to older code
if it had run after. If you ever find a stale queued deployment behind
a newer one, cancel the stale one: `vercel remove <deploymentId> --yes`.

A build failure is not automatically a code bug — this repo's MongoDB
Atlas connection has produced transient `MongoPoolClearedError`/
`MongoNetworkTimeoutError` failures during static generation before,
unrelated to any code change. Before assuming a regression: check
whether the failure is a Mongo network timeout (retry the deploy — a
failed deploy never gets promoted, so production is never at risk
while you investigate) versus a real build error in the log.

## 6. Confirm

- Check the deploy's final `readyState` is `READY` and `target` is
  `production` (the JSON output from `vercel --prod --yes` shows this
  directly).
- If the change touched `vercel.json` (e.g. a cron schedule), confirm
  with `vercel cron ls` — Vercel will reject a schedule the current
  plan doesn't support, so a successful `cron ls` listing is itself
  proof the plan supports it.
- Report back what changed and what was verified — not just "deployed".
