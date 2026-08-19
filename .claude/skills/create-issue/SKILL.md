---
name: create-issue
description: Create a GitHub issue using this repo's issue templates, with a milestone and native blocked-by/blocking relationships. Use when creating a GitHub issue, filing a bug/chore/audit, or opening a follow-up issue.
---

# Create Issue

Turns a problem discussed in conversation into a properly-templated GitHub
issue: right template, relevant labels, a milestone, and any blocking
relationships to other issues — all shown to the user for approval before
anything is created. Strictly scoped to **creating new issues**; editing
relationships between two already-existing issues is out of scope (do that
with a plain `gh issue edit` call instead).

**Issues capture the problem, not the fix.** Body content should describe
what's wrong or missing, and optionally capture first-impression ideas for a
fix if they've come up — never prescriptive step-by-step implementation
instructions ("change line X to do Y").

If there isn't enough context in the conversation to draft a solid issue
(unclear scope, missing detail on what "done" looks like), use the
`grill-me` skill to get it rather than guessing.

## Step 1: Read the current templates fresh, every time

```sh
ls .github/ISSUE_TEMPLATE/*.md
```

Read each one in full. **Do not rely on a remembered list of sections from a
previous run or from this file** — the templates are expected to change over
time, and this skill must reflect whatever they currently say, not a
snapshot.

## Step 2: Pick a template

Match the drafted issue's content against each template's `about:`
frontmatter and body. Most issues fall cleanly into one:

- Pick automatically when one template is the clear fit.
- If it's genuinely ambiguous between two, or **no template fits**, stop and
  ask the user how to proceed — explain why nothing fits. Don't force a fit
  or invent a new template.

## Step 3: Draft the body

Fill in the chosen template's sections with real content, preserving its
heading structure and any checklist items (leave `Definition of Done`
checkboxes unchecked). Replace HTML-comment placeholders with actual
content; don't leave them in. Draft from what's already been discussed in
the conversation — ask only for what's genuinely missing.

## Step 4: Propose labels

```sh
gh label list
```

Propose a subset of the **existing** labels based on the issue's content
(e.g. `privacy-rule` for anything touching owner-identity display,
`needs-migration` for schema changes, `a11y`/`i18n`/`storybook` where
relevant, `bug`/`enhancement` for the general category). Never invent a
label that isn't already in the list. These are shown in the preview
(Step 7) — the user can add/remove before anything is created.

## Step 5: Propose a milestone

```sh
gh api repos/{owner}/{repo}/milestones --jq '.[] | select(.state=="open") | {number, title, description}'
```

Every issue gets a milestone — never leave it blank. Match by content
against each milestone's `title`/`description`. If no milestone is a clean
fit, **ask the user to pick one from the list** rather than guessing or
defaulting to one.

## Step 6: Check for relationships to existing open issues

```sh
gh issue list --state open --json number,title,body,url --limit 100
```

Closed issues don't need checking — they're already done. Read through open
issues for plausible blocking relationships with the issue being drafted
(in either direction — the new issue could block one of them, or be blocked
by one of them). For every plausible candidate, no matter how confident it
seems, **ask the user to confirm** before wiring it in — never assume a
relationship silently. Skip anything that's a stretch rather than asking
about every loosely-related issue.

## Step 7: Handle multiple related issues in one request

If the user is asking for several new issues that depend on each other
(e.g. "file three issues for this, where the second depends on the first"),
they must be created one at a time, in dependency order:

1. Figure out the dependency order — an issue can only reference another as
   `--blocked-by`/`--blocking` once that other issue actually exists (has a
   real number). Create the one with no unresolved dependency on
   not-yet-created issues in this batch first.
2. Preview and get explicit approval for **that one issue** (Step 8), then
   create it and capture its real issue number from the output.
3. Move to the next issue in the batch, now able to reference the real
   number(s) from step 2 in its own `--blocked-by`/`--blocking`.
4. Repeat until the batch is done.

Never draft the whole batch as one combined preview — approval is
per-issue, since later issues' relationship fields aren't final until
earlier ones in the batch actually exist.

## Step 8: Preview and confirm

Before running `gh issue create`, show the user the complete picture for
this one issue:

- Title
- Template used (and why, only if it wasn't a clean/obvious fit)
- Full rendered body
- Proposed labels
- Proposed milestone
- Any proposed relationships (`blocked by #N — <title>`, `blocking #M —
<title>`)

Wait for explicit approval. Never call `gh issue create` without it.

## Step 9: Create the issue

Write the composed body to a temp file (in the session scratchpad
directory) and create via:

```sh
gh issue create \
  --title "<title>" \
  --body-file <path-to-temp-body-file> \
  --label "<label1>" --label "<label2>" \
  --milestone "<milestone title>" \
  --blocked-by <number>[,<number>...] \
  --blocking <number>[,<number>...]
```

Omit `--blocked-by`/`--blocking` entirely if there are none. Requires `gh`
2.94+ for the relationship flags — if a command fails with an "unknown
flag" error, check `gh --version` before debugging further.

## Step 10: Error handling

If any `gh` command fails (creation or a lookup), **stop immediately**.
Don't retry automatically and don't attempt to roll back or delete
anything already created. Report:

- Which issues in this batch were already created (numbers + URLs)
- What failed, and the exact error
- Ask the user how they'd like to proceed

## Step 11: Report the result

Once all approved issues in the batch are created, summarize each one:
issue number, URL, template used, labels, milestone, and any relationships
wired in.

## Out of scope

- Assignees and GitHub Projects — not handled by this skill.
- Editing relationships between two issues that **both already exist**,
  outside of a creation flow — use `gh issue edit <number> --add-blocked-by
<number>` / `--add-blocking <number>` directly instead.
