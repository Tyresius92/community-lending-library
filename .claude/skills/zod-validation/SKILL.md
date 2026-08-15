---
name: zod-validation
description: Validate route action FormData with Zod. Use when adding or changing form validation in a route action, or wiring a new form's errors into TextInput/TextArea/Select/RadioGroup.
---

# Zod Validation

Route actions validate `FormData` with [Zod](https://zod.dev) schemas under `app/schemas/<model>.server.ts` — see [CLAUDE.md](../../../CLAUDE.md) for where this fits in the app's architecture.

## The core split

**Schemas validate and emit semantic codes. Routes decide what those codes mean on screen.**

A schema file (`app/schemas/item.server.ts`) knows nothing about i18n or display text — its `.min()`/`.max()`/`.regex()`/`.enum()` calls use short semantic CODE strings as their message (`"NAME_REQUIRED"`, never `"errors.nameRequired"` and never English prose). A route action translates those codes into text with its own local `t()` calls. This means:

- The **validation rule** (what's a valid name, what counts as a taken slug) is written once per model and reused by every route that needs it.
- The **display text** is a route/UI concern. Two routes validating the same model (e.g. item create vs. edit) are free to show different copy for the same code — coincidentally showing the same English text today isn't duplication worth fighting.
- There is **no shared parsing helper**. A route calls Zod directly: `schema.safeParse(Object.fromEntries(formData))`. Reading the failure back out uses `result.error.issues` (Zod's raw, non-deprecated issue list) plus a small type guard exported by the schema file — not `.flatten()`/`.format()` (deprecated in Zod 4) and not a type assertion.

## Step 1: Define the schema

One file per model: `app/schemas/<model>.server.ts` — kept `.server.ts` on purpose, since it pulls in `zod` and that has no reason to ship to the client for logic that only ever runs inside an action. Full worked example:

```ts
// app/schemas/item.server.ts
import { z } from "zod";

import {
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from "~/schemas/item_constants";

const itemBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "NAME_REQUIRED")
    .max(NAME_MAX_LENGTH, "NAME_TOO_LONG"),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX_LENGTH, "DESCRIPTION_TOO_LONG"),
});

// Identical shapes today — aliased, not artificially diverged. Split with
// .extend()/.omit()/.pick() if a future field only applies to one flow.
export const itemCreateSchema = itemBaseSchema;
export const itemEditSchema = itemBaseSchema;

export type ItemErrorCode =
  | "NAME_REQUIRED"
  | "NAME_TOO_LONG"
  | "DESCRIPTION_TOO_LONG";

// A type guard, not a type assertion — narrows a plain string (from Zod's
// issue.message, which TS can't statically tie to our codes) to ItemErrorCode.
export const isItemErrorCode = (value: string): value is ItemErrorCode =>
  ["NAME_REQUIRED", "NAME_TOO_LONG", "DESCRIPTION_TOO_LONG"].includes(value);
```

```ts
// app/schemas/item_constants.ts — NOT .server.ts, see below
export const NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;
```

Conventions to follow:

- **A constraint also needed client-side** (e.g. `NAME_MAX_LENGTH`, reused for a `maxLength` JSX attr) does **not** live in the `.server.ts` schema file — put it in a sibling, unsuffixed `<model>_constants.ts`, and have both the schema and the route's component import it from there. If a `.server.ts` file's export is referenced anywhere outside a `loader`/`action`, React Router either hard-errors ("Server-only module referenced by client") or, if you drop the suffix to work around that, ships the whole file — schema, codes, and the `zod` library itself — into the client bundle for every route that imports anything from it, even the parts only used server-side. Most models won't need a constants file at all — item does today, community and login don't (see their schema files).
- **Variants** are derived from a base `z.object({...})` via `.extend()`/`.omit()`/`.pick()`. Where two routes need an identical shape, just alias the variant name to the same schema object (`export const itemEditSchema = itemBaseSchema`) — don't invent divergence that doesn't exist yet.
- **Export a flat union of the model's error codes** (`ItemErrorCode`). This is the one piece of compile-time safety in this pattern: a route's `messages: Record<ItemErrorCode, string>` map is checked for exhaustiveness by TypeScript. Add or remove a code in the schema and every route's map either gains a required key or a stale one — both compile errors, not a blank error message discovered in production.
- **Export a type guard alongside it** (`isItemErrorCode`). Zod's `issue.message` is typed as a plain `string`, so a route needs to narrow it before indexing into a `Record<ItemErrorCode, string>` map. Use a real runtime check (`Array.prototype.includes` against the code list), never `as ItemErrorCode` — this repo doesn't use type assertions to bridge this kind of gap.
- **A code produced by a route itself** after a DB check (see `SLUG_TAKEN` in `app/schemas/community.server.ts`) still belongs in the model's exported error-code union (and its type guard), with a comment noting it's not produced by Zod. It flows through the same `messages` map as everything else.
- **No async `.refine()`, no Prisma access inside a schema.** DB-dependent checks (slug uniqueness) are a separate step in the route, after a successful parse.
- **Don't invent constraints that don't exist today.** If a field has no length limit in the current app, don't add one just because a sibling field has one — check `prisma/schema.prisma` for a real signal before adding a rule.

## Step 2: Parse, then build the route's own code→text map

Call the schema directly — no wrapper. On failure, look up each field's first issue in `result.error.issues` and narrow its code with the schema's type guard before indexing into a local `messages` map:

```ts
import { data } from "react-router";

import {
  isItemErrorCode,
  itemCreateSchema,
  type ItemErrorCode,
} from "~/schemas/item.server";

export async function example(formData: FormData, t: (key: string) => string) {
  const result = itemCreateSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    const messages: Record<ItemErrorCode, string> = {
      NAME_REQUIRED: t("errors.nameRequired"),
      NAME_TOO_LONG: t("errors.nameTooLong"),
      DESCRIPTION_TOO_LONG: t("errors.descriptionTooLong"),
    };

    const fieldMessage = (field: string): string | undefined => {
      const issue = result.error.issues.find(
        (issue) => issue.path[0] === field,
      );
      return issue && isItemErrorCode(issue.message)
        ? messages[issue.message]
        : undefined;
    };

    return data(
      {
        errors: {
          name: fieldMessage("name"),
          description: fieldMessage("description"),
        },
      },
      { status: 400 },
    );
  }

  return result.data;
}
```

On success, `result.data` is the fully-typed, already-trimmed output — use it directly, no manual `.trim()` or `tiny-invariant` narrowing needed.

This `fieldMessage` closure is **per-route, not shared**, even when two routes validate the same model (`my_items/new` and `my_items/$itemId/edit` each build their own `messages` map and closure). A field with only one possible code doesn't need a map at all — write the `t()` call inline (see the community join action in `app/routes/communities/$communitySlug/$communitySlug.tsx`).

New i18n keys referenced by a `messages` map go under the route's existing namespace file's `errors` group (`app/locales/en/<namespace>.json`), alongside `labels`/`buttons`/`nav`/`meta` — never a new per-screen nesting. See [CLAUDE.md](../../../CLAUDE.md)'s i18n section for the full convention.

## Step 3: Wire errors into components

`TextInput`, `TextArea`, `Select`, and `RadioGroup` all share one contract: `errorMessage?: string`. `actionData?.errors.<field>` plugs straight in — no `?? undefined` needed, since a field with no error is simply `undefined` (not `null` like the old hand-rolled validation used to return). Any constant the component also needs (like `maxLength`) is imported from the unsuffixed constants file, never from the `.server.ts` schema file:

```tsx
import { TextInput } from "~/components/text_input/text_input";
import { NAME_MAX_LENGTH } from "~/schemas/item_constants";

export function Example({
  actionData,
}: {
  actionData?: { errors: { name?: string } };
}) {
  return (
    <TextInput
      label="Name"
      name="name"
      type="text"
      maxLength={NAME_MAX_LENGTH}
      errorMessage={actionData?.errors.name}
    />
  );
}
```

## Folding in a DB-sourced error

A DB check (e.g. community slug-taken, discovered only after a successful parse) is expressed as the _same_ code, already part of the model's error-code union, and indexed into the _same_ `messages` map already built for the schema errors — one map, one mental model, regardless of whether Zod or Prisma found the problem:

```ts
// community.server.ts already includes "SLUG_TAKEN" in CommunityErrorCode,
// covered by the messages map built for the schema-failure branch above.
export function example(
  slugIsTaken: boolean,
  messages: Record<string, string>,
) {
  const slugTakenErrors = {
    errors: {
      name: undefined,
      slug: messages.SLUG_TAKEN,
      visibility: undefined,
      joinPolicy: undefined,
      displayName: undefined,
    },
  };

  return slugIsTaken ? slugTakenErrors : null;
}
```

Keep every branch of an action's `data()` calls returning the **same errors shape** (all field keys present, `undefined` for fields that aren't at issue) — the component accesses `actionData?.errors.<field>` across whichever branch actually ran, and TypeScript needs that property to exist on every branch of the union.

## Testing

Test the schema directly — there's no parse helper to test. Use this repo's `it.each` object-array + `$name`-title convention, with a small local `buildFormData` helper (this app's first tests to construct `FormData` by hand):

```ts
import { describe, expect, it } from "vitest";

import { itemCreateSchema } from "./item.server";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }
  return formData;
}

describe("itemCreateSchema", () => {
  it.each([
    {
      name: "rejects an empty name",
      entries: { name: "" },
      expectedCode: "NAME_REQUIRED",
    },
    {
      name: "accepts a valid name",
      entries: { name: "Drill" },
      expectedCode: null,
    },
  ] as const)("$name", ({ entries, expectedCode }) => {
    const result = itemCreateSchema.safeParse(
      Object.fromEntries(buildFormData({ description: "", ...entries })),
    );

    const actualCode = result.success ? null : result.error.issues[0]?.message;

    expect(result.success).toBe(expectedCode === null);
    expect(actualCode).toBe(expectedCode);
  });
});
```

See `app/schemas/item.server.test.ts` and `app/schemas/community.server.test.ts` for full reference files.

## Checklist for a new route's validation

1. Does a schema for this model already exist under `app/schemas/`? If yes, reuse or derive a variant with `.extend()`/`.omit()`/`.pick()` — don't write a new schema from scratch.
2. If not, create `app/schemas/<model>.server.ts`: base object, exported constants (or import them from a new sibling `<model>_constants.ts` if the component needs them too), exported `<Model>ErrorCode` union, exported `is<Model>ErrorCode` type guard.
3. In the action: `schema.safeParse(Object.fromEntries(formData))`.
4. On failure: look up each field's first issue in `result.error.issues`, narrow it with the type guard, build (or inline) this route's code→text map, return a consistently-shaped `errors` object.
5. On success: use `result.data` directly.
6. Wire `errorMessage={actionData?.errors.<field>}` into the relevant components, importing any shared constant from `<model>_constants.ts` if one exists.
7. Add any new i18n keys under the namespace file's existing `errors` group.
8. Add/extend `<model>.server.test.ts` with edge cases (empty, over-limit, invalid enum value, valid).
9. `npm run validate`.
