# ADR: Passwordless Magic-Link Authentication

**Status:** Accepted

---

## Context

The app needs an authentication mechanism for community members. It's a
low-frequency tool — someone opens it to list an item, check on a loan, or
respond to a request, not something used daily — being built first as a
small pilot for real neighbors rather than a general public product. Email is
already the primitive the app needs for invites and loan notifications, so
whatever auth mechanism is chosen has to coexist with that.

## Options Considered

### Traditional email/password

Familiar to every user, but pushes real costs onto a small pilot app: secure
password storage (hashing, breach monitoring), a reset flow, and the support
burden of infrequent users forgetting passwords between visits. None of that
effort buys additional security relevant to this app's actual risk profile.

### OAuth / social login (Google, etc.)

Removes password storage, but ties every member's ability to log in to a
third-party account and requires maintaining a registered OAuth client.
Adds an external dependency and consent screen for what's meant to be a
low-friction pilot, and some members may not want to link a Google account
just to borrow a ladder from a neighbor.

### Passwordless magic link

**Chosen.**

Email is already required for invites and notifications, so it's a natural
identity primitive rather than an extra one. No password to store, rotate,
or leak. Single-use, time-limited tokens narrow the attack surface to email
account compromise — which is already the practical reset vector for most
password schemes anyway.

## Decision

`User` has no password field. Login is entirely by emailed magic link:

- `login.tsx` validates and rate-limits the submitted email
  (`app/utils/rate_limit.server.ts`), upserts a `User`, and creates a
  `MagicLink` (`app/models/magic_link.server.ts`) — a random token, only its
  SHA-256 hash stored, 20-minute expiry, single-use enforced via a
  conditional `updateMany` so an email-scanner prefetch of the link can't
  burn it before the real click.
- The link is emailed via react-email + Resend (`app/mailer.server.ts`).
- `magic_link.tsx` consumes the token and calls `createUserSession`, which
  stores just `userId` in a signed cookie
  (`app/session.server.ts`).

**Auth guards never throw.** `getUserId`/`getUser` resolve the signed-in user
(or `undefined`/`null`) instead of throwing; a loader/action that requires
auth checks the result itself and returns `loginRedirect(url)`. This exists
so nothing in a loader/action throws a non-`Error` value (a `Response`) —
this repo enforces ESLint's `@typescript-eslint/only-throw-error` rule, which
disallows that. There's deliberately no throwing `requireUser`/`requireUserId`
helper; new guards follow the same check-and-return-early shape.

## Consequences

**Positive:**

- No password storage, rotation, or breach surface.
- Login doubles as email verification — every account is provably reachable
  at its email from the moment it exists.
- Simpler UX for infrequent use — nothing to forget between visits.

**Negative / Tradeoffs:**

- Login requires access to email at the moment of signing in; there's no
  offline or no-email fallback.
- Magic links are bearer tokens — anyone with the link (a forwarded email, a
  shared inbox) can complete login. Mitigated by the 20-minute expiry and
  single-use enforcement, but it's a different threat model than
  password-plus-optional-2FA.
- Rate limiting the send path is load-bearing, not optional — without it,
  the login form is an email-bombing vector against any address typed in.
- No account-recovery path beyond "request another magic link" — if a member
  loses access to their email entirely, there's no separate recovery
  mechanism. Acceptable for a small pilot; worth reassessing before wider
  release.
