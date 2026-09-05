# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React Router (Framework Mode) + Prisma + PostgreSQL app for a community lending library — members share items within a community and track loans through a request/accept/checkout/return lifecycle.

The Prisma schema (`prisma/schema.prisma`) already models the full domain — `Community`, `CommunityMembership`, `Item`, `Loan`, `Message`, `InviteToken`. Application code has partially caught up: auth, communities, `Item` management, `Loan`, and `InviteToken` are wired up; `Message` is not yet. Check whether the schema already has the shape you need before changing it. See [docs/adr/](docs/adr/) for the reasoning behind major decisions.

This file stays short on purpose. "How this codebase is shaped" — routing, data model, i18n, auth, validation, components, testing, logging — lives under [.claude/reference/](.claude/reference/), one file per domain, pointed to from the Delegation table below. Read the relevant file when a fork in that category comes up, rather than expecting everything inline here.

## Commands

```sh
npm run docker          # start Postgres in Docker (detached; wait for healthy before using)
npm run setup            # prisma generate + migrate deploy + db seed
npm run dev               # start dev server (http://localhost:3000)
npm run build             # production build
npm run typecheck        # tsc, no emit
npm run lint              # eslint (cached)
npm run lint:fix
npm run format             # prettier --write .
npm run format:check       # prettier --check . (read-only; used in CI)
npm run test               # vitest (watch mode)
npm run test -- --run     # vitest, single run
npm run test -- --run app/utils.test.ts   # run a single vitest file
npm run test:e2e:run      # npx playwright test (spins up dev server itself)
npm run step-check          # typecheck + lint + format
npm run ship-check          # full pre-completion gate: docker, typecheck, tests, build, e2e, lint, format
npm run storybook          # start Storybook dev server (http://localhost:6006)
npm run build-storybook   # build static Storybook
```

- `postinstall` runs `prisma generate` automatically after `npm install`.
- Prisma client is generated into `app/generated/prisma` (git-ignored, must exist before typecheck/build will pass).
- After changing `prisma/schema.prisma`, run `npx prisma migrate dev`.
- Playwright needs the Docker Postgres container up first (`npm run docker`).

## How we work: the 4 Ds

This project's working style is organized around Anthropic's 4 Ds of AI Fluency — **Delegation, Description, Discernment, Diligence** — as four continuously-active competencies, not sequential phases of a task. Each shows up repeatedly, at its own natural moments, not once in a fixed order.

The throughline across all four: asking costs a short pause; guessing wrong costs rework, an explanation, and re-teaching the same lesson. Where those two costs are in tension, ask.

### Delegation

Which category a decision falls into — not a per-task triage step, a standing table consulted whenever a fork actually appears:

| Category                                                                                                                                                                     | Whose call                                                           | Reference                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| Route/file/directory shape when more than one structure is reasonable                                                                                                        | Yours                                                                | [routing.md](.claude/reference/routing.md)       |
| Data model / schema shape choices                                                                                                                                            | Yours                                                                | [data_model.md](.claude/reference/data_model.md) |
| Anything surfacing a member's identity or item ownership to another member                                                                                                   | Yours                                                                | [privacy.md](.claude/reference/privacy.md)       |
| UX/permission rules, naming with more than one reasonable option                                                                                                             | Yours                                                                | —                                                |
| Extending or creating a component-library component's API                                                                                                                    | Yours                                                                | [components.md](.claude/reference/components.md) |
| Adding a code comment                                                                                                                                                        | Yours — never Claude's default, even where the WHY seems non-obvious | —                                                |
| Scaffolding that mirrors an already-established pattern (a new CRUD route shaped like `my_items`, a schema shaped like an existing one, a test shaped like an existing spec) | Claude's                                                             | —                                                |
| i18n wiring, formatting/lint fixes following existing convention                                                                                                             | Claude's                                                             | [i18n.md](.claude/reference/i18n.md)             |
| Research/reading                                                                                                                                                             | Always Claude's, no delegation question                              | —                                                |

A fork that doesn't match an existing row is exactly the trigger to ask, not to proceed on judgment. The table grows by adding a row after a genuinely new case gets resolved — not written preemptively for hypothetical categories. Each reference file's own "Standing questions" section holds the finer-grained considerations for its category.

### Description

For a fork identified via the table above: propose an answer with rationale, and get it confirmed or overridden — not a blank ask, not multiple-choice by default. The `grill-me` skill is the mechanism for this; the relevant reference file's "Standing questions" section is what it should draw on for that category.

A GitHub issue states the problem only — "what's wrong" or "what's missing" (see the issue templates under `.github/ISSUE_TEMPLATE/`). What a given issue's "done" requires gets worked out live during planning via Delegation/Description, not pre-baked as a checklist at filing time. Standing quality bars (tests, a11y, i18n, Storybook — see the relevant reference file) apply project-wide regardless; they don't need restating per issue.

### Discernment

- Any new route/file structure, data shape, or multi-case rule (permissions, state transitions) gets rendered as a plain diagram or table wherever one applies — never left as raw code/config syntax standing in for an explanation of the decision.
- Before calling `ExitPlanMode`, and before declaring a task or step done, invoke the `fork-auditor` agent against the plan or the diff — a fresh-context check for forks that slipped past the table above, including ones in a category the table doesn't have yet.

### Diligence

- **One logical unit at a time.** Break work into discrete steps. For a step that changes code, run `npm run step-check` before checking in; on any failure, fix the root cause and rerun it from scratch (not just the failing part) until it passes clean. A step that's pure research, planning, or reading has nothing for `step-check` to check, so skip it. Complete one step, report what was done, and wait for approval before starting the next — a clean pass is the signal to stop, not to keep going.
- **Before declaring a whole task (typically a GitHub issue) done**, run `npm run ship-check` — it chains, in order: start Docker → typecheck → full test suite (both Vitest projects) → build → Playwright e2e → lint → format. On any failure, fix the root cause, then **rerun from scratch**, not just the failing check — a fix for one step can break an earlier one (a lint autofix that breaks typecheck, a type fix that breaks a test). Only report the task done once `npm run ship-check` passes clean in one uninterrupted run.
- **Tests are part of the task, not a follow-up.** Every change to production code includes tests in the same unit of work — see [testing.md](.claude/reference/testing.md) for the Vitest/Playwright split. Never write a throwaway test file for ad-hoc confidence-checking; write the permanent test and run just that file.
- **Documentation is part of the task, not a follow-up.** A change to a convention or architectural decision updates the relevant `.claude/reference/*.md` file (or this file, for the 4-Ds workflow itself) in the same unit of work that made it stale — and gets a new ADR under `docs/adr/` if it's a real decision with alternatives, not a follow-up issue.
- Commit review is manual: Claude does not run `git commit` in this repo — every commit is yours, and it's the last checkpoint before anything ships.

## Conventions

- **New files, directories, and routes use `snake_case`** (e.g. `magic_link.server.ts`), not kebab-case. React component export names stay `PascalCase`. Exception: dynamic route segments are camelCase, prefixed with `$` (e.g. `$communitySlug`).
- Import alias `~/*` maps to `app/*`. ESLint enforces import ordering/grouping and treats `~/` as internal.
- ESLint runs `eslint-plugin-jsx-a11y`'s `strict` ruleset against all JS/TS/JSX/TSX files — the accessibility enforcement layer at lint time, alongside the Storybook/Playwright axe checks in [testing.md](.claude/reference/testing.md).
- `*.server.ts` naming marks server-only modules — keep secrets and DB/Prisma access behind that suffix.
- Dependencies in `package.json` are pinned to exact versions (no `^`/`~` ranges) — match that when adding packages.

## CI/CD

`.github/workflows/deploy.yml` runs lint, typecheck, vitest, and Playwright on every push/PR. On success: pushes to `dev` deploy to the Fly.io staging app, then fast-forward `dev` into `main`; pushes to `main` deploy to production. There's no separate merge-to-main step.

## Env vars

See `.env.example`: `DATABASE_POOLER_URL`, `DATABASE_DIRECT_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`. Separate `.env.staging` / `.env.production` files exist alongside `.env`.
