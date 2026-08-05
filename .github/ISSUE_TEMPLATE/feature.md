---
name: Feature
about: A new route, screen, or user-facing functionality
title: ""
labels: ""
---

## Summary

<!-- What is this issue about? What should exist once it's done that doesn't exist now? -->

## Blocked by

<!-- List any issues that must land first, e.g. "Blocked by #12". Delete this section if nothing blocks this issue. -->

## Definition of Done

- [ ] **Unit tests** — any data-transformation logic pulled out of the loader/action into a helper function has vitest coverage (pure input → output). Loaders/actions themselves are not unit tested directly — their auth, DB fetch, and return-data steps are covered by E2E tests instead.
- [ ] **E2E tests** — Playwright coverage for the happy path and edge cases introduced by this issue (this is what exercises the loader/action's auth, DB fetch, and return path).
- [ ] **Accessibility (AA)** — semantic HTML, labels, keyboard navigation, focus management, and contrast meet WCAG AA. `playwright-axe` run against any new/changed screen with no unresolved violations.
- [ ] **i18n** — all new UI copy goes through the `react-i18next` setup (no hardcoded strings). User-generated content (item descriptions, loan messages, etc.) is exempt.
- [ ] **Storybook** — any new or modified design-system component has a story, and passes the `@storybook/addon-a11y` check. N/A if this issue doesn't touch `app/components/`.
- [ ] **Docs** — `CLAUDE.md` updated if this issue changes something it documents (new route pattern, new model, new env var, new convention).
- [ ] **Privacy rule** — if this issue touches Browse, Item Detail, My Loans, or Members, confirm owner identity stays hidden until a loan request is accepted, and item ownership is never shown/inferable on Members. N/A otherwise.
- [ ] `npm run validate` passes (lint, typecheck, vitest, e2e).
