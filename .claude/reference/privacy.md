# Owner-identity privacy rule

Enforced in loaders/actions, not just hidden client-side: item owner identity is never shown to a browsing member — a neutral placeholder ("a neighbor") renders instead, until that viewer's own loan request on the item is accepted. The merged `items/$itemId.tsx` route's own-item branch (`isOwnItem`) is exempt, since that's always the viewer's own item. The Members list must never show or allow inferring item ownership. See [ADR-004](../../docs/adr/ADR-004-owner-identity-privacy-rule.md) for why.

This cuts across [routing.md](routing.md) (`items` list/detail, Members), and My Loans — check this rule whenever a change touches any screen that renders another member's identity or their items.

## Loan threads

A loan's message thread (`loans/$loanId/$loanId.tsx`) is visible to, and sendable by, its two parties only while the loan is `pending`, `accepted`, or `active`. Once it's `completed`, `declined`, `cancelled`, or `expired`, the loader omits the messages entirely (not just hides them), the page shows a "messaging is closed" notice instead, and the `send_message` intent returns 403. The rows stay in the database. Status is checked after `expireIfNeeded`, like every other loan intent. See [ADR-008](../../docs/adr/ADR-008-loan-thread-visible-only-while-loan-is-live.md) for why.

Each message reaches the client with an `isMine` flag only, never `senderId` or a sender name. The other party's messages are labeled with the same ADR-004 label the page already computes for them (their display name, or "A neighbor"). Because that label is computed at render time, an owner's messages that a borrower saw as "A neighbor" while the loan was `pending` show the owner's name once it's accepted. This is intended: it's the same reveal ADR-004 already grants.

## Standing questions

- Does this screen/query expose another member's identity, or which items they own?
- Which role is viewing, and have they actually been granted visibility into this specific loan/item, or not?
- Could an aggregate or count indirectly reveal ownership (e.g. a per-item-type count on Members)?
- Is the viewer looking at their own data? (The rule doesn't apply there.)
