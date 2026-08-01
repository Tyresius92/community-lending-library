---
name: react-router
description: Build features with React Router in Framework Mode. Use when configuring routes, route modules, loaders, actions, forms, fetchers, navigation, pending UI, SSR/SPA/pre-rendering, middleware, URL params/search params, or React Router upgrades.
license: MIT
---

# React Router

This app uses React Router's Framework Mode (`@react-router/dev`, `app/routes.ts`, route modules under `app/routes/`, `./+types/...` imports — see [CLAUDE.md](../../../CLAUDE.md)).

Read `references/framework-mode.md` before making routing/loader/action changes.

## Use Installed Docs as Source of Truth

React Router ships markdown docs in the package so guidance can match the installed version:

```txt
node_modules/react-router/docs/
```

Key docs paths:

```txt
node_modules/react-router/docs/index.md
node_modules/react-router/docs/start/framework/
node_modules/react-router/docs/how-to/
node_modules/react-router/docs/explanation/
node_modules/react-router/docs/upgrading/
```

Most docs include a mode marker near the top:

```txt
[MODES: framework, data, declarative]
```

Only apply a doc when its mode marker includes `framework`.

## Upgrades

If asked to upgrade React Router or apply a future flag, read `react-router/docs/upgrading/future.md` and relevant files under `react-router/docs/upgrading/`.
