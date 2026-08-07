---
name: zine-design-system
description: Visual design system for Community Lending Library — a "zine/photocopied flyer" aesthetic (flat color blocks, thick black borders, hard offset drop-shadows, sharp corners). Use when building, styling, or reviewing UI screens, components, or nav for this app.
---

# Zine Design System

This is design ideation distilled into a spec — low-to-mid fidelity, treated as inspiration and constraints, not a pixel-perfect target. Reinterpret freely using this codebase's actual patterns (React Router + CSS Modules + `app/components/`, Radix color scales copy-pasted into a local token file — see [CLAUDE.md](../../../CLAUDE.md)) where it improves the real product. Page-level layouts below are **not settled**; the tokens and rejected-direction constraints are the strongest signal and should be carried forward with fidelity.

## Core concept

"Zine / photocopied flyer": hand-assembled community flyers, highlighter-marker tags, halftone-dot photo placeholders, rubber-stamp badges — filtered through a cleaned-up, high-contrast "comic panel" execution (flat color blocks, thick black outlines, hard offset drop-shadows, no gradients, mostly sharp 90° corners). Scrappy/DIY and neighborly without being twee; stays legible for a mixed-ability, non-technical audience.

**Explicitly rejected — do not revive:**

- **Library card-catalog** direction (serif type, oxblood/forest palette) — read as generically corporate-polished.
- Heavy **rotation/"askew" chaos** (cards tilted at random angles) — disorienting as a sustained pattern. Tilt/rotation is a rare accent only (e.g. a rotated "Available now" stamp), never a structural default.
- **Left icon rail + sidebar nav** with "My Communities" as a sidebar item _inside_ a community's section list — inverts the information hierarchy and doesn't map to nested routes (see IA note in CLAUDE.md). The chosen pattern is a **top nav**: dark bar, community switcher (avatar + name + dropdown) on the left, horizontal section links (Browse Items / Members / My Loans) beside it, active section shown inverted (white pill on dark bar). Mobile: same dark bar condensed to avatar + name + dropdown, plus a hamburger menu for section links + "switch community."

## Design tokens

### Colors (Radix scales, vendored locally — consume via the local token file, not npm; use full 1–12 steps per scale, not just these accent swatch tones)

- **Sand** — neutral scale. Paper/background surfaces + primary "ink" text. Stand-ins used in mocks: `#F3EEE1` (paper bg), `#1A1A1A` (ink/near-black text).
- **Amber** — highlighter/tag accent + CTA drop-shadow color. `#FFD93D` / `#FFC53D`.
- **Pink** — category tag color (e.g. "Kitchen"). `#FF6FB3` / Radix Pink 9 `#D6409F`.
- **Mint** — category tag + "Available now" positive badge. Kept visually distinct from Grass so decorative category color never collides with system status color. `#8FE3C5` / `#86EAD4`.
- **Tomato** — category badge / urgent-alert accent (e.g. overdue). `#E5312B` / `#E54D2E`.
- **Grass** — reserved for actual system "success" status (confirmed, returned) — kept separate from Mint's decorative use. `#46A758`.
- Category-color system should accept an open-ended set of Radix scales, not a hardcoded 3–5 — more accents (purple, sky, yellow, teal) will likely be added as item categories grow.

### Shape & surface (the "must-keep" signature details)

- **Sharp corners** — 0px border-radius on cards, panels, buttons, tags by default. (Avatars/photos may stay circular/rounded — a separate shape language for "people," not "objects/panels.")
- **Hard offset drop-shadows** — no blur, e.g. `box-shadow: 4px 4px 0 <ink>` (solid color, not black-alpha) on cards and primary CTAs. This is the single most distinctive, load-bearing visual signature.
- **Thick borders** — 2–2.5px solid dark borders on cards/tags/inputs, in the "ink" color (near-black or Sand 12), not light gray.
- **Halftone-dot placeholder** — item/member photo placeholders use a dot pattern (`radial-gradient(circle, ink 1–1.5px, transparent) / 6–9px tile`) rather than a flat gray box.
- **Pins** — a small circular pin (10–13px, solid accent color, subtle drop shadow) at the top-center of a card, used sparingly (e.g. item detail hero photo) as a corkboard callback — not on every card.
- **Rotation** — reserved for a single badge/stamp element (e.g. "Available now," a category roundel), rotated roughly -8° to -10°. Never applied to cards, containers, or body text at rest.

### Typography (placeholder pairing — final fonts are up to the developer/designer)

- Display/headers: a bold, condensed-ish grotesk (mocks used Archivo Black as a stand-in) — any confident, chunky display face works.
- Body/UI/labels: a monospace (mocks used Space Mono) — reinforces the typewriter/zine feel; category tags and metadata read well as short, uppercase, letterspaced mono labels (`TOOLS`, `KITCHEN`, `OUTDOORS`).
- A cursive/handwriting accent (Caveat) is optional, low-priority, single-use-case only.

### Spacing (starting scale, from the mocks)

- Card padding: ~8–16px depending on card size.
- Card grid gap: 12–16px.
- Section/page padding: 24–28px desktop, 14–16px mobile.
- Touch targets: nothing under 44px tall on mobile (accessibility floor, see below).

## Screens

All screens live under a community-scoped route root — see the IA note in [CLAUDE.md](../../../CLAUDE.md) for the actual route structure and the owner-masking privacy rule these screens must enforce.

1. **Browse Items** (grid) — header with community name, search, horizontally-wrapping category tag/chip filter row. Responsive card grid (2-col mobile, denser desktop). Card: halftone placeholder photo, item name (display font, uppercase), owner first-name + distance, sharp corners, hard drop-shadow border. _(Owner name shown pre-request in the mocks — corrected by the privacy rule: mask/omit until accepted.)_
2. **Item Detail** — large halftone hero photo (optional pin accent), title, rotated circular category badge, owner mini-profile row, availability badge, description, full-width primary CTA ("Ask to borrow") with hard drop-shadow, member metadata footer.
3. **My Communities** — one level above any single community's routes. Grid of community cards (avatar, name, member count, item count, stats like "3 lent" / "1 active loan"), "Open" + "Leave" actions, plus a dashed-border "Join a community" card as the last grid cell.
4. **Members** — layout is **unresolved as cards**; build as a table (desktop) collapsing to a stacked list (mobile) instead, since it scales better past a handful of members. Per member (privacy-critical): name + avatar, "member since" date, lend count (number only, never which items), optional verified/trust badge, optional short bio. Item ownership must never be shown or inferable here (see privacy rule).
5. **My Loans** — two clear sections/columns, "Borrowing" and "Lending" (not tabs, not a unified list — explicitly requested). Row: photo swatch, item name, counterpart name (or "a neighbor" pre-acceptance), status badge. Status vocabulary: Requested (pending) → Accepted/ready for pickup → Active (currently borrowed) → Overdue → Returned/completed → Declined/cancelled, each with a distinct badge color (e.g. Amber=Requested, Mint=Active, Tomato=Overdue, Sand=Returned) plus a text label — never rely on color alone.
6. **Navigation shell** — see "top nav" description under rejected directions above.

## Copy / tone voice

- Direct, warm, neighborly — never corporate, never cutesy/twee. Avoid startup-speak ("leverage," "seamless," "community-powered marketplace").
- Short, plain-language labels: "Ask to borrow," "Available now," "a neighbor," "Member since 2019." Avoid jargon like "SKU," "inventory," "listing" — say "item."
- Never imply trust/verification claims the product doesn't actually make (e.g. don't ship a "✓ verified" badge unless there's a real verification system behind it — flag this before shipping that specific badge).

## Accessibility requirements

Primary audience is explicitly mixed-ability: non-technical, older, and low-vision users must be able to use this comfortably. This is a hard constraint on the whole system.

- Minimum touch target 44×44px on any interactive control, mobile or desktop.
- Preserve the high-contrast palette (flat color blocks + thick dark borders + solid drop-shadows, no low-contrast gray-on-white) — don't let a later "softening" pass wash out border/text contrast.
- ~13–14px practical floor for body text, ~11px floor for the smallest metadata/labels (some mock chrome text dips to ~8–9px purely for compressed-mockup purposes — don't ship that).
- Pair every status badge with a text label, never color alone.
- Rotated/tilted elements (badges, stamps) must never rotate body text a user needs to read quickly/repeatedly.
