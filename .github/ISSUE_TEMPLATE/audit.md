---
name: Audit
about: A dedicated sweep across already-built screens/features (accessibility, privacy rule, regression, etc.)
title: ""
labels: ""
---

## Scope

<!-- What is being audited, and across which screens/routes/issues? -->

## Blocked by

<!-- List every issue whose output this audit depends on, e.g. "Blocked by #8, #9, #10". -->

## Pass criteria

<!-- What does "no findings" or "clean" look like for this specific audit? Be concrete — e.g. "playwright-axe reports zero violations across Browse, Item Detail, My Loans" or "no screen shows owner identity before a loan request is accepted." -->

## Definition of Done

- [ ] Audit run and findings (if any) documented below, or confirmed clean.
- [ ] Any findings filed as follow-up issues or fixed directly in this issue.
- [ ] `npm run validate` passes (lint, typecheck, vitest, e2e).
