# Community Lending Library

A web app for neighbors to lend and borrow items within a private community — tools, equipment, anything that's more useful shared than owned by everyone individually. Members create or join a community, list items they're willing to lend, and browse what others have made available. Browsing preserves privacy: an item owner's identity isn't shown until they've accepted a specific loan request, so listing something doesn't mean broadcasting who owns it to everyone in the community.

## Core Features

- **Communities** — create or join a community, with public and invite-only visibility.
- **Item management** — list, edit, and remove items you're willing to lend.
- **Privacy-preserving browsing** — item owners stay anonymous to browsing members until a loan request is accepted.
- **Passwordless authentication** — sign in via an emailed magic link, no password to manage.
- **Accessibility as a first-class constraint** — automated WCAG AA checks run at both the component and page level.
- **Translation-ready** — UI copy is routed through an i18n layer from the start, even though only English is populated today.

Loans, invites, messaging, and member management are actively being built — see Project Status below.

## Tech Stack

- [React Router](https://reactrouter.com) (Framework Mode) for routing, data loading, and mutations
- [Prisma](https://prisma.io) + PostgreSQL for data
- [Zod](https://zod.dev) for form validation
- [react-i18next](https://react.i18next.com) for internationalization
- [Sentry](https://sentry.io) for error tracking
- [Storybook](https://storybook.js.org) for component development, with automated accessibility checks
- [Vitest](https://vitest.dev) and [Playwright](https://playwright.dev) for testing
- Deployed on [Fly.io](https://fly.io)

## Architecture

Significant technical and product decisions — why passwordless auth, why item ownership is hidden until a loan request is accepted, why Zod for validation, and more — are recorded in [docs/adr/](docs/adr/). Read those before making a structural change; an "obvious" alternative may already have been considered and rejected for a documented reason.

## Project Status

This is an early-stage pilot, not a finished product.

**Built:** passwordless auth, community create/join, item management, form validation conventions, error tracking/logging.

**In progress:** browsing items across a community, invites, the loan request/accept/checkout/return lifecycle, in-app messaging, member management.

**Planned:** a settled visual design direction (currently unstyled by design), security hardening (CSRF protection, durable rate limiting), and further out — item categories, live messaging, additional languages.

## Running Locally

```sh
npm run docker   # start Postgres in Docker
npm run setup    # generate the Prisma client, run migrations, seed the database
npm run dev      # start the dev server at http://localhost:3000
```

Sign-in is by magic link — there's no password. In development, the login link is printed to the console instead of actually being emailed.

## Testing

```sh
npm run ship-check   # typecheck, unit tests, build, e2e, lint, format
```

Vitest covers unit-level and component-level tests; Playwright covers end-to-end flows through the UI. See [CLAUDE.md](CLAUDE.md) for the full breakdown of what goes where.
