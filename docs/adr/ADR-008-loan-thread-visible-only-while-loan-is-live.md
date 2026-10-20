# ADR: Loan Thread Visible Only While the Loan Is Live

**Status:** Accepted

---

## Context

Issue #35 added a message thread to each loan, so a borrower and owner can
coordinate about that specific loan (e.g. an owner telling a pending
requester "someone has this until Tuesday, want to wait?"). The thread lives
on the loan detail page and is only ever visible to the loan's two parties.

The open question was what happens to the thread once the loan is over:
`completed`, `declined`, `cancelled`, or `expired`. Messages are free text,
so they can carry anything a member chooses to share, including their real
name, phone number, or address for a pickup. [ADR-004](ADR-004-owner-identity-privacy-rule.md)
already decided that a party's identity is shown only while the loan is in a
status where the relationship is actually live, and hidden again once it
ends.

## Options Considered

### Always open

Both parties can read and send in every status. Simplest, but it leaves a
permanent private channel between two members after the reason for it has
ended, and keeps exposing whatever identifying detail was shared in it,
which contradicts ADR-004's boundary.

### Open while live, read-only history afterwards

Sending stops when the loan ends, but the thread stays visible. This keeps a
record for reference, but anything identifying shared during the loan stays
visible indefinitely, even though ADR-004 hides the other party's display
name at that same moment. The page would hide a name while still showing a
message that contains it.

### Open while live, hidden afterwards

**Chosen.**

The thread is readable and writable while the loan is `pending`, `accepted`,
or `active`. Once it's terminal, the thread is hidden from both parties.

## Decision

- **Live statuses** (`pending`, `accepted`, `active`): the loader returns the
  thread and both parties can send.
- **Terminal statuses** (`completed`, `declined`, `cancelled`, `expired`):
  the loader returns no messages at all. This is enforced server-side, not
  just hidden by the component. The page shows a "messaging is closed"
  notice, and the `send_message` intent returns 403. Status is evaluated
  after `expireIfNeeded`, like every other loan intent.
- Rows are not deleted. Hiding is a read-time rule, so it can be revisited
  later without data loss.
- Message attribution reuses ADR-004's labels unchanged. Each message
  reaches the client with only an `isMine` flag, and the other party's
  messages carry the same name-or-"A neighbor" label the page already
  computes. Since that label is computed at render time, a borrower who saw
  an owner's messages as "A neighbor" while the loan was pending sees the
  owner's name on those same messages once it's accepted.

## Consequences

**Positive:**

- One consistent rule for everything a loan exposes: the display name and the
  conversation both appear and disappear at the same status boundary.
- No lingering private channel between two members once their loan is over.
- Server-side omission means the guarantee holds against someone inspecting
  the raw response, the same standard ADR-004 sets.

**Negative / Tradeoffs:**

- Neither party can look back at what was agreed once a loan ends, for
  example when following up on a dispute about a completed loan's condition.
- Anything still worth saying after a loan ends needs a new loan or happens
  outside the app.
- Because rows are kept, "hidden" is not "deleted". A future feature that
  reads `Message` directly (moderation tooling, a data export) has to decide
  for itself whether this rule applies.
