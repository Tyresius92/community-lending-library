# Auth (passwordless, magic-link)

See [ADR-001](../../docs/adr/ADR-001-passwordless-magic-link-authentication.md) for why. No password field on `User`; login is by emailed link only.

Auth guards never throw: `getUserId`/`getUser` resolve the signed-in user (or `undefined`/`null`), and a loader/action that requires auth checks the result and returns `loginRedirect(url)`:

```ts
const userId = await getUserId(request);
if (!userId) {
  return loginRedirect(url);
}
```

There's no throwing `requireUser`/`requireUserId` — new guards follow this check-and-return-early shape.

## Standing questions

None yet — the check-and-return-early shape above is the established convention; a new guard following it is Claude's call.
