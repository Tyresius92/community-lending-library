# Testing

- Vitest runs `*.test.*` files colocated under `app/`.
- Tests needing real data hit the real `postgres_test` database via `prisma` — no mocking. Test data comes from `@quramy/prisma-fabbrica` factories in `app/factories/`; add a new factory there, not a one-off `prisma.create()` call, for any model that doesn't have one yet.
- A second, browser-mode Storybook Vitest project runs every story's play functions and its accessibility check. `npm run test` runs both projects together.
- Playwright e2e specs live in `tests/`. A11y is checked here too, via `expectNoAxeViolations(page)` — the same enforced bar as Storybook's check, at the rendered-page level.
- `npm run test:db:reset` resets the test database manually.
- MSW (`mocks/`) is available for stubbing third-party HTTP in tests/dev; see `mocks/README.md`.
- Use the `it.each` object-array + `$name`-template form for parameterized tests, not positional tuples — see [validation.md](validation.md) for a worked example.

## Standing questions

None yet — writing tests that follow the coverage split in the project's main testing guidance (Vitest for utility/server logic, Playwright for page flows) is Claude's call.
