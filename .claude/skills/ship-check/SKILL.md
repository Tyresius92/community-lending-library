---
name: ship-check
description: Run the full pre-completion verification gate (npm run ship-check) before declaring any coding task — typically a GitHub issue — complete. Fixes failures and reruns from scratch until everything's green.
---

# Ship Check

Run `npm run ship-check`. It chains, in order: start Docker → typecheck →
full test suite (both Vitest projects) → build → Playwright e2e → lint →
format.

On any failure: fix the root cause, then **rerun `npm run ship-check` from
scratch** — don't resume from where it failed. A fix for one check can
break an earlier one (a lint autofix that breaks typecheck, a type fix
that breaks a test), so a partial rerun can't be trusted.

Only report the task as done once `npm run ship-check` passes clean in one
uninterrupted run.
