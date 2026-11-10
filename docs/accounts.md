# ROQVYN accounts

The public application uses Neon Auth (managed Better Auth), a Neon PostgreSQL
database, and same-origin Vercel Functions. The static private Sites edition links
to `https://knightlab.vercel.app/account/` for accounts; it does not pretend to run
the Vercel backend.

## User flow

Choose **Sign in** in navigation, create an account using email and a password,
then verify the email code. Existing accounts can sign in or reset their password
using an email code. Before activating the account, the user can explicitly opt
to combine the guest progress on this device with their account. Guest progress
is retained separately and is restored on sign-out.

Completed lessons, partial lesson/exercise drafts, coordinate practice, daily and
adaptive training, Board Lab records, and the existing recent review cache sync.
Theme, sound preferences, and Chess.com username remain device preferences.
The existing review-cache limit of eight games is unchanged. This is progress
sync, not unlimited game archival.

Progress is saved locally first. Pending changes survive reload and sync when
online. Optimistic revisions protect concurrent writes; completions and solved
tasks combine across devices. An explicit retry starts a new exercise run without
revoking earned completion. Remote changes do not interrupt an active board;
the account page offers a reload when new progress arrives.

## Backend and deployment

Runtime-only Vercel variables: `DATABASE_URL`, `NEON_AUTH_BASE_URL`. Never add
their values to source, browser bundles, screenshots, or logs. Provider-created
`VITE_NEON_AUTH_URL` is not required by this application. The SDK is lazy-loaded
and reaches `/api/auth/`; no database credential is shipped to the browser.

Apply the initial schema once using an ignored local environment file:

```sh
node --env-file=.env.local scripts/migrate-accounts.mjs
```

The migration is applied to the production database. Add a new migration for
future schema changes. The progress table has RLS enabled and no public policy;
the server verifies JWT signature, issuer, audience, expiry, and the verified
database identity before scoped parameterized queries. Writes use a transactional
revision check and a per-user 8 MiB / 1,000-key quota. Each item is at most 2.1 MB.
Neither request bodies nor query parameters can choose another owner.

Auth cookies are Secure/HttpOnly and scoped to the application host through the
restricted same-origin proxy. Admin routes and arbitrary forwarding are blocked.
Auth/progress responses use `private, no-store`. Auth POSTs and progress writes
require the exact application Origin. JWTs stay in SDK memory, not localStorage.

The provider's shared email sender is intended for initial use. Delivery and
volume depend on Neon Auth email limits; configure a custom SMTP sender before
a high-volume launch. SMTP, social login, account deletion UI, and unlimited
game storage are outside this change.

## Checks

`npm test` covers identity isolation, guest import consent, sign-out ordering,
offline/reload persistence, merging and conflict retries, auth proxy restrictions,
and existing chess features. Account UI tests use a small DOM fixture; these are
not browser or real-device tests.

Run the explicit backend check against provisioned Neon:

```sh
node --env-file=.env.local scripts/verify-accounts-live.mjs
```

For deployed HTTP routes, set `ACCOUNT_TEST_ORIGIN` to the canonical public URL
and run the same script. It creates two uniquely named accounts on the reserved
`tests.example.invalid` domain, verifies only these fixture identities in SQL,
tests owner isolation and revision conflicts, and removes their rows in `finally`.
It does not send codes to a real person and does not test email delivery.

Browser Use was unavailable for this change. No screenshots, mobile viewport
checks, real iPhone/iOS Safari, or Edge UI tests were performed. Account styling
uses the existing theme tokens, normal document flow, 16px form text, and at least
44px buttons; visual behavior still requires browser/device verification.
