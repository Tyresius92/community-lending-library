# Logging & error tracking

Use `app/logger.ts`'s `logger` (`error`/`warn`/`info`/`setUser`) instead of `console.*` in server-side app code — it reports to Sentry. Sentry is not initialized in local development or tests. CLI scripts and dev-only output that must never reach Sentry (e.g. anything containing a live token) stay on raw `console.*`.

## Standing questions

None yet — using `logger` instead of `console.*` in server-side app code is Claude's call.
