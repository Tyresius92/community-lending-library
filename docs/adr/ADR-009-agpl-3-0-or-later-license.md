# ADR: License the Project Under AGPL-3.0-or-later

**Status:** Accepted

---

## Context

A public repository with no license is all-rights-reserved by default:
anyone can read the code, but nobody can legally reuse, fork, or modify it.
The project needs a license that lets other communities run their own
lending library.

The choice is unconstrained. Every direct dependency is under a permissive
license (MIT, Apache-2.0, BSD-2-Clause, ISC, Unlicense, or MPL-2.0), so no
dependency forces a particular license. And the code has a single copyright
holder, so the license can apply to all of it without anyone else's
consent.

The app is a hosted web service. That matters for the choice, because most
licenses' share-alike obligations are triggered by _distributing_ the code,
and a hosted app never distributes it to its users.

## Options Considered

### Stay all-rights-reserved

Leave the repo without a license, or add an explicit notice. The code stays
visible but can't be reused, which defeats the point of other communities
running their own lending library.

### MIT

Short and familiar, with almost no friction for reuse. It also allows a
modified, closed-source hosted version, so someone could take the app, build
on it, and run it without sharing their changes.

### Apache-2.0

Permissive like MIT, adding an explicit patent grant and a requirement to note
changes. It has the same closed-hosted-fork outcome as MIT, plus more text,
and patent questions aren't a realistic concern for this project.

### AGPL-3.0

**Chosen.**

Copyleft that covers network use. Section 13 requires anyone who runs a
modified version as a service to offer its source to that service's users.
That closes the "hosted closed fork" gap that plain GPL leaves open for web
apps.

### `-only` vs `-or-later`

`AGPL-3.0-or-later` was chosen. It's the FSF's default and the more common
form, and it lets the code move to a future AGPL version without having to
get every copyright holder to agree.

## Decision

- The project is licensed under **AGPL-3.0-or-later**. The verbatim license
  text is in `LICENSE`, and `package.json` declares
  `"license": "AGPL-3.0-or-later"`.
- The copyright notice (`Copyright (C) 2026 Tyrel Clayton`) and the standard
  AGPL notice paragraphs live in the README's License section. No per-file
  license headers are added.
- A site-wide footer links to the source repository ("Source code
  (AGPL-3.0)"). This makes the §13 source offer visible to users and gives a
  fork an obvious place to point at its own source.
- Outside contributions aren't accepted, so there is no CLA,
  DCO, or `CONTRIBUTING` file.

## Consequences

**Positive:**

- Other communities can legally run, study, and modify the app.
- Modified hosted versions must share their source with their users, so
  improvements can't be locked away in a closed fork.
- With a single copyright holder and contributions closed, relicensing later
  (for example to a permissive license, or a dual license) remains possible
  without anyone else's consent.

**Negative / Tradeoffs:**

- Some individuals and companies avoid AGPL code entirely, which narrows who
  will reuse or build on it.
- Anyone running a modified version takes on the §13 obligation, and has to
  update the footer's source URL to point at their own repository.
- The root `ErrorBoundary` replaces the whole layout, so error pages don't
  show the footer link. Keeping the link there needs an error boundary
  inside the layout.
- If contributions are opened later, the project has to decide on
  inbound licensing (inbound = outbound, DCO, or CLA). Without a CLA,
  accepting outside code ends the option to relicense unilaterally.
