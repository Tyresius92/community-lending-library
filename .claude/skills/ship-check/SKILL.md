---
name: ship-check
description: Run the full pre-completion verification suite (typecheck, unit tests, build, e2e, lint, format) in strict order, fixing failures and restarting from the top until everything passes. Use before declaring any coding task done.
---

# Ship Check

`npm run validate` runs these same checks but in parallel and all-or-nothing —
fine for CI, unhelpful when you're mid-task and need to know exactly which
check broke and why. Run them one at a time instead, in this order:

1. `npm run typecheck`
2. `npm run test -- --run` (both Vitest projects — the app suite and the
   Storybook/`@storybook/addon-a11y` project)
3. `npm run build`
4. `npm run test:e2e:run` (needs the Docker Postgres container up —
   `npm run docker` first if `postgres_test` isn't reachable)
5. `npm run lint`
6. `npm run format:check`

On any failure in steps 1–5: fix the root cause, then **restart from Step 1**.
A fix for one check can break an earlier one (a lint autofix that breaks
typecheck, a type fix that breaks a test) — don't resume from where you left
off.

On a Step 6 failure: run `npm run format` (auto-fixes in place) and re-run
Step 6 to confirm. No need to restart from Step 1 — formatting doesn't touch
logic.

Only report the task as done once all six steps pass in one uninterrupted
run.
