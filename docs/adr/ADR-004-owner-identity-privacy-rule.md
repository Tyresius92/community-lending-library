# ADR: Owner Identity Hidden Until a Loan Request Is Accepted

**Status:** Accepted

---

## Context

Members browse a shared catalog of items other community members are
willing to lend, before any relationship or trust has been established with
a given owner for a given item. Left unguarded, that catalog doubles as a
map of who owns what — a browsing member (or anyone with access to the app)
could profile a neighbor's possessions, or use that information to make
unwanted contact, without ever having actually engaged in a loan.

## Options Considered

### Always show owner identity

Simplest to build, but exposes every member's name/avatar against their full
item inventory to anyone browsing, whether or not they've ever interacted.
Turns the catalog into a directory of "who has what," which is more
disclosure than borrowing an item requires.

### Full anonymity even after a loan is arranged

Rejected: a borrower and owner coordinating pickup and return of a real
physical object genuinely need to know who they're dealing with — a real
name supports trust, coordination, and accountability for a shared item.
Anonymity through the whole loan lifecycle would make the app impractical
for an actual exchange between neighbors.

### Identity hidden until a specific loan request is accepted

**Chosen.**

Owner identity stays hidden while a member is just browsing, and is revealed
only to the specific borrower whose request the owner has accepted — the
moment the two people actually need to know each other. Community
membership alone establishes trust in the community, not in a specific
other member; a specific loan does.

## Decision

- **Items list and Item Detail:** owner identity never surfaces for a viewer
  who doesn't have an accepted loan request on that specific item. A neutral
  placeholder ("a neighbor") renders instead of a name/avatar; a member's
  own item shows "You". This is computed **server-side** — the raw
  ownership id itself is never sent to the client for another member's item,
  so the guarantee isn't just CSS-hidden and doesn't depend on trusting the
  client not to look.
- **My Loans** is the one place a real name can appear, since the viewer is
  already a party to that specific loan — but only while the loan is in a
  status where that specific relationship is actually live. The two
  directions are **not** symmetric:

  - **Borrowing (viewer is the borrower):** the owner's real name shows only
    while the loan is `accepted` or `active` — never while `pending` (the
    request hasn't been accepted yet, so the ordinary hidden-until-accepted
    rule still applies), and never again once the loan is `completed`,
    `declined`, `cancelled`, or `expired`. A neutral placeholder renders
    otherwise, exactly as it would on Browse/Item Detail.
  - **Lending (viewer is the owner):** the borrower's real name shows while
    the loan is `pending`, `accepted`, or `active` — `pending` is included
    here, unlike the borrower's side, because the owner has to know who is
    asking in order to decide whether to accept. It does not show once the
    loan is `completed`, `declined`, `cancelled`, or `expired`.

  Both directions are computed **server-side**, same as Item Detail — the raw
  name must never be present in the loader's response when hidden, not
  merely hidden by the component.

- **`my_items`** is exempt entirely, since it only ever shows the viewer's
  own items.
- **Members list:** item ownership must never be shown or inferable at all —
  not per-type item counts, not a click-through from a member to their
  listings. Even a seemingly harmless count can become an inference channel
  once cross-referenced against the (privacy-preserving) Items list. Only
  aggregate, non-identifying stats (e.g. total lend count) are safe.
- Multiple members can each hold a pending request on the same item at
  once — accepting one doesn't auto-decline the others, so a request's mere
  existence never reveals anything about competing requesters to each other
  either.

## Consequences

**Positive:**

- Meaningfully reduces exposure to inventory profiling or unwanted contact
  for members who haven't entered an actual loan.
- The trust boundary (an accepted request) lines up with the real moment two
  people need each other's identity — not earlier, not later.
- Enforcing this server-side means the guarantee holds even against a
  technically curious member inspecting the raw response, not just someone
  reading the rendered page.

**Negative / Tradeoffs:**

- Every loader/action touching items or members has to actively implement
  this exclusion rather than getting it for free from a naive query — a
  missed case is a real privacy leak, not a cosmetic bug, so it needs its
  own dedicated e2e audit coverage distinct from ordinary feature tests. My
  Loans is the easiest place to get this wrong: "the viewer is a party to
  this loan" is not by itself sufficient justification to show a name — the
  loan's current status has to be checked too, per-direction, every time.
- Queries are a bit more involved than a plain join: each row needs "is this
  my item" / "do I have an accepted request on this item" computed
  per-viewer.
- The Members list's "no per-type item counts" rule limits what stats can
  ever be shown there, even otherwise-useful ones, since almost any granular
  per-member stat risks becoming an inference channel back to ownership.
