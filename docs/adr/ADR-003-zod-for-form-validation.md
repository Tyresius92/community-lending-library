# ADR: Zod for Form Validation, With Semantic Error Codes

**Status:** Accepted

---

## Context

Route actions need to validate submitted `FormData` consistently enough that
a new route (and a new contributor) can see exactly how to wire one up, and
that routes sharing a model (e.g. item create vs. edit) reuse validation
instead of re-deriving it by hand each time.

## Options Considered

### Hand-rolled validation (manual conditionals, no library)

What predates this decision — ad hoc field checks and error objects built by
hand per route. No single source of truth for what's valid on a given model,
easy to skip a check when copying a route, and no compile-time signal when a
route's error-handling forgets to cover a case.

### Prisma-generated Zod schemas (e.g. `zod-prisma-types`)

Would keep schema field types in sync with `prisma/schema.prisma`
automatically. Rejected: a generator only saves re-typing field _types_ — it
doesn't give the per-field constraints, custom messages, or
create/edit-specific omitted fields that make a hand-written schema actually
useful for form validation. Adds a dependency and a generated-output folder
that isn't worth it at this app's model count.

### Hand-written Zod schemas with semantic error codes

**Chosen.**

One file per model under `app/schemas/`, hand-written, with named variants
derived via `.extend()`/`.omit()`/`.pick()` from a base schema. Validation
messages are short semantic codes (`"NAME_REQUIRED"`), not English text and
not i18n keys directly — keeping the schema itself free of any i18n
coupling, so two routes validating the same model can show different copy
for the same underlying rule without forking the schema.

## Decision

- One file per model: `app/schemas/<model>.ts` — a base `z.object()`, plus
  named variants (`itemCreateSchema`, `itemEditSchema`, etc.) for routes that
  need a slightly different shape off the same model.
- Schema messages are semantic CODE strings only. Display copy is a route
  concern: each action builds its own local code→`t()` map, looks up each
  field's first issue in `result.error.issues` (never the deprecated
  `.flatten()`/`.format()`), and narrows it with an exported type guard
  (never a type assertion) before indexing into the map.
- Each model file exports a flat union of its error codes
  (`<Model>ErrorCode`) and an `is<Model>ErrorCode` type guard. The exported
  union is the one piece of compile-time safety in this pattern — a route's
  `messages: Record<ErrorCode, string>` map is checked for exhaustiveness by
  TypeScript, so adding or removing a code is a compile error at every call
  site, not a blank error message discovered in production.
- No async `.refine()`, no Prisma access inside a schema. DB-dependent
  checks (e.g. community slug uniqueness) are a separate step after a
  successful parse, expressed as the same kind of code flowing into the same
  messages map.
- Enum-like fields (`visibility`, `joinPolicy`) use `z.enum([...])` — a
  deliberate behavior change from any prior looser handling: an invalid or
  missing value now produces a validation error instead of silently
  defaulting.
- No shared parse helper — actions call
  `schema.safeParse(Object.fromEntries(formData))` directly.

Full step-by-step conventions (schema shape, the parse/narrow pattern,
wiring errors into form components) live in the `zod-validation` skill; this
ADR records why the approach was chosen, not how to use it.

## Consequences

**Positive:**

- One source of truth per model for what's valid, reused across
  create/edit variants instead of re-derived per route.
- Compile-time exhaustiveness checking on every route's code→copy map, via
  the exported error-code union and type guard.
- Decoupling schema constraints from display copy lets two routes on the
  same model diverge in wording without forking validation logic.

**Negative / Tradeoffs:**

- An extra layer of indirection to learn: routes map codes to text via
  `result.error.issues` and a type guard, not Zod's simpler (but Zod-4
  deprecated) `.flatten()`/`.format()`.
- Hand-written schemas duplicate field knowledge Prisma already has (name,
  type, optionality) — schema and Prisma model can drift if one is updated
  without the other, with no generator keeping them in sync.
- DB-dependent checks living outside the schema means every route needing
  one (e.g. slug uniqueness) implements it as a second, separate step rather
  than a single validate-everything call.
