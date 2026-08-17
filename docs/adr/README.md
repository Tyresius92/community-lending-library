# Architecture Decision Records

An ADR records a significant technical or product decision — what was
decided, what alternatives were considered, and why — so a future reader
doesn't have to reconstruct the reasoning from code alone. Files are named
`ADR-NNN-kebab-case-slug.md`, numbered sequentially in the order they were
written. Numbers are never reused: a decision that gets revisited or
reversed gets a new, later ADR that references the one it supersedes, rather
than editing history in place.

| #                                                        | Title                                                  | Summary                                                                                                                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [001](ADR-001-passwordless-magic-link-authentication.md) | Passwordless Magic-Link Authentication                 | Login is by emailed magic link only, with no password field on `User`, to avoid password-storage risk and reset-flow overhead for a low-frequency app.                                                         |
| [002](ADR-002-direct-prisma-access-over-model-layer.md)  | Direct Prisma Access Over a Model Layer                | Newer feature routes call Prisma directly instead of going through a shared model layer, since most queries have exactly one call site; cross-cutting checks like community role are the deliberate exception. |
| [003](ADR-003-zod-for-form-validation.md)                | Zod for Form Validation, With Semantic Error Codes     | Route actions validate `FormData` with hand-written Zod schemas that emit semantic error codes rather than English text or i18n keys, keeping validation and display copy decoupled.                           |
| [004](ADR-004-owner-identity-privacy-rule.md)            | Owner Identity Hidden Until a Loan Request Is Accepted | Item owner identity is hidden from browsing members and enforced server-side, revealed only to the specific borrower once their loan request is accepted.                                                      |
| [005](ADR-005-i18n-with-react-i18next.md)                | i18n via react-i18next, Set Up Before Feature UI       | Translation infrastructure (react-i18next, middleware-resolved locale, centralized namespace files) was wired in before most feature UI was built, to avoid an expensive later retrofit.                       |
