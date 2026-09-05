# Component library

`app/components/`: `Button`, `Link`, `TextInput`, `TextArea`, `Select`, `RadioGroup`, `Checkbox`, `Modal`, `Box`, `Table`. Build new forms/nav/UI from these rather than raw HTML elements. Currently unstyled — components exist for semantic/accessible structure and will be styled later without call sites needing to change.

When an existing component doesn't support something a feature needs, or no suitable component exists yet, extend or create one — don't work around the gap with a one-off inline style, a bespoke wrapper, or a raw HTML element instead. Propose the change first (the prop name/behavior, or a full new-component API) and wait for approval before writing code.

## Storybook

Every component library component has a colocated `*.stories.tsx`, run via `npm run storybook`. Every new or modified component ships with a story as part of its own PR — enforced, not just convention: `@storybook/addon-a11y` runs an accessibility check against every story, so a violation fails `npm run test` and blocks CI.

## Standing questions

- Does an existing component already cover this, even partially?
- What's the proposed prop name and behavior, or the new component's full API?
- Does an existing story need updating, on top of any new one?
