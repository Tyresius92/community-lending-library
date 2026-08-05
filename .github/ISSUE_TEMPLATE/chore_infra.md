---
name: Chore / Infra
about: Schema migrations, tooling setup, shared helpers, cleanup — no user-facing UI
title: ""
labels: ""
---

## Summary

<!-- What is this issue about? What should exist once it's done that doesn't exist now? -->

## Blocked by

<!-- List any issues that must land first, e.g. "Blocked by #2". Delete this section if nothing blocks this issue. -->

## Definition of Done

- [ ] **Unit tests** — vitest coverage for any standalone data-transformation helper function (pure input → output). Auth/permission-check helpers and DB-fetch logic are exercised via the E2E tests of the routes that use them, not unit tested directly. N/A if this issue is pure config/tooling/migration with no transform-data helpers.
- [ ] **Docs** — `CLAUDE.md` updated if this issue changes something it documents (new convention, new env var, new tooling, new migration pattern).
- [ ] `npm run validate` passes (lint, typecheck, vitest, e2e).
