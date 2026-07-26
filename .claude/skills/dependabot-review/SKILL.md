---
name: dependabot-review
description: Reviews a Dependabot-authored pull request — checks whether the impacted package is still used, pulls real release notes, scales research depth to the size of the version jump, and ends with a fixed recommendation (close, merge as-is, merge with follow-up, changes required, or extensive prerequisite work). Use when asked to review a PR opened by Dependabot, or a PR whose title matches Dependabot's "Bump <pkg> from X to Y" format.
when_to_use: Trigger on "review PR #N" / "check this dependabot PR" / "review the dependency bump" when `gh pr view <n> --json author` resolves to dependabot[bot] or app/dependabot, or the PR title matches Dependabot's bump format ("Bump <pkg> from X to Y", "bump <pkg> and <pkg> in /<path>"). Skip for human-authored PRs (use /code-review or /review instead) or for reviewing the user's own working diff (use /code-review).
argument-hint: "[pr-number-or-url]"
arguments: [pr]
context: fork
agent: general-purpose
---

Review a Dependabot pull request and end with exactly one of five recommendations: close (unused dependency), safe to merge as-is, merge with encouraged follow-up, changes required before merge, or extensive prerequisite work (draft a GitHub issue, ask before creating it).

Use ordinary tool calls for every step below — do not batch or parallelize independent `gh`/`git`/`npm`/WebFetch calls "to save time." Each one should run on its own so the user can approve it individually, and so sequential decisions (like the release-notes fallback in Step 5) aren't pre-empted by work that's already in flight.

## Step 1 — Identify and confirm

Run `gh pr view $pr --json number,title,author,body,baseRefName,headRefName`.

If the author is not `dependabot[bot]` / `app/dependabot`, stop and tell the user this PR isn't Dependabot-authored — point them at `/review` or `/code-review` instead. Do not continue.

## Step 2 — Determine ecosystem and enumerate packages

Run `gh pr diff $pr`. Identify which files changed:

- `package.json` / `package-lock.json` → npm ecosystem
- `.github/workflows/*.yml` → github-actions ecosystem

Extract every `{package, fromVersion, toVersion}` pair from the PR title and diff hunks. A grouped PR (e.g. this repo's `react-router` group in `.github/dependabot.yml`) touches multiple packages in one PR — capture all of them, not just the first.

## Step 3 — Branch by ecosystem

**github-actions packages:** confirm the action is still referenced with `grep -r "<action-name>" .github/workflows/`. If unused, recommend closing the PR (or dropping just that action, for a grouped PR) and skip the rest of the steps for it. If still used, skim its release notes for breaking changes and go straight to Step 7 (CI status) — skip the deep codebase-impact research in Steps 4-6, which is npm-specific.

**npm packages:** continue to Step 4 for each one.

## Step 4 — Usage check (per npm package)

Run `git grep -l "from [\"']<package>[\"']"` and `git grep -l "require(.<package>"` across `app/`. Also check `package.json` `scripts` for CLI-only tools that won't show up as imports (eslint, prettier, vitest, playwright, prisma, etc.).

If the package is unused: recommend dropping it (and recommend closing the whole PR if it's the only package involved). Do not research this package further. If other packages remain in a grouped PR, continue reviewing them.

If every package in the PR is unused, the overall recommendation is "close — dependency unused" and you can skip straight to the final report.

## Step 5 — Pull release notes (per still-used npm package)

Do this **sequentially, one source at a time** — do not fetch multiple sources at once "just in case."

1. Resolve the package's repo: `npm view <package> repository.url`.
2. Try `gh api repos/<owner>/<repo>/releases` for every version between `fromVersion` and `toVersion` (not just the latest). If that's empty or the repo doesn't use GitHub releases, try that repo's `CHANGELOG.md` via `gh api repos/<owner>/<repo>/contents/CHANGELOG.md` (or fetch the raw file on the default branch).
3. If neither GitHub source yields usable notes, **stop and ask the user** (AskUserQuestion) whether to fall back to the npm registry page for this package. Only fetch the npm page (WebFetch) if they say yes. If they say no, proceed with whatever you have (possibly nothing) and note the gap in the final report.

## Step 6 — Scale research depth to the version jump

Compare `fromVersion` and `toVersion` as semver:

**patch or minor bump:** skim the release notes for security advisories or bug fixes that touch code paths actually used in this repo. Quick `git grep` for any API the notes call out as newly deprecated.

**major bump:** read the full migration guide / breaking-changes section. Cross-reference against `docs/adr/` for any ADR tied to this package or its problem space (e.g. a `react-router` major bump against ADR-001's reasoning; an `eslint` major bump against the prior `.eslintrc.cjs` → `eslint.config.js` migration precedent in this repo's history). `git grep` for every breaking API the changelog mentions to gauge actual blast radius in this codebase — don't just take the changelog's word for what's affected.

## Step 7 — CI status

Run `gh pr checks $pr`. Note pass/fail per check. Call out any mismatch between CI status and your own findings — e.g. CI is green but the changelog flags a breaking change relevant to this repo, or CI is red on something clearly unrelated to the version bump.

## Step 8 — Final recommendation

Choose exactly one, for the PR as a whole (synthesizing across all packages
in a grouped PR):

- **Close — dependency unused.**
- **Safe to merge as-is.**
- **Merge, with encouraged (non-blocking) follow-up** — describe the follow-up work and why it's not blocking.
- **Changes required before merge** — describe exactly what needs to change, naming the specific files in this repo.
- **Extensive prerequisite work** — describe the work needed, then draft a GitHub issue (title + body) and show it to the user, asking them to approve it. If they approve, run `gh issue create` with that exact title/body. If they don't approve, or ask for edits, do not create anything — just leave the draft in the conversation.

Never post a comment or review on the PR itself (no `gh pr comment`, `gh pr review`) — report findings back to the main conversation only.

## Final report format

Return to the main conversation:

1. Per-package findings: usage check result, version jump (semver category), release-note summary, codebase impact.
2. CI status summary.
3. The single overall recommendation for the PR, with reasoning.
