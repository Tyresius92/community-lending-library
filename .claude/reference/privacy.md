# Owner-identity privacy rule

Enforced in loaders/actions, not just hidden client-side: item owner identity is never shown to a browsing member — a neutral placeholder ("a neighbor") renders instead, until that viewer's own loan request on the item is accepted. `my_items` is exempt (always your own items). The Members list must never show or allow inferring item ownership. See [ADR-004](../../docs/adr/ADR-004-owner-identity-privacy-rule.md) for why.

This cuts across [routing.md](routing.md) (Browse Items, Item Detail, Members), `my_items`, and My Loans — check this rule whenever a change touches any screen that renders another member's identity or their items.

## Standing questions

- Does this screen/query expose another member's identity, or which items they own?
- Which role is viewing, and have they actually been granted visibility into this specific loan/item, or not?
- Could an aggregate or count indirectly reveal ownership (e.g. a per-item-type count on Members)?
- Is the viewer looking at their own data? (The rule doesn't apply there.)
