# Firebase Spark QA: Accounts and Finance

Project: `dovecupdatabase---qa` (project number `880555630326`).
Database: `(default)`, Toronto `northamerica-northeast2`.
Plan requirement: Spark only, without a linked billing account.

This is an independent browser app for Firebase Authentication, member profiles,
administrator access, payment verification, shared packages, and attendance deductions.
It uses Firebase Spark plus GitHub Pages, without Functions, paid Hosting or Storage.
The local Node/SQLite preview remains unchanged and is not migrated or copied.

Cloud scope is deliberately limited to accounts and finance. The original signup chain,
court arrangement, special tournaments, automatic archival, account deletion and full
historical attendance UI are not ported to this cloud entry yet. Do not describe this as
the complete local sandbox or switch the production signup links to it.

## Administrator Bootstrap

The owner has created Firebase Authentication UID `96nSpcqjhaYKgsISJSVz6ZuB1qZ2`.
In the QA Firestore console only, create:

- Collection: `administrators`
- Document ID: `96nSpcqjhaYKgsISJSVz6ZuB1qZ2`
- Field: `enabled`, boolean `true`

Do not grant roles by matching email, by trusting browser profile fields, or by
letting the first registered account become admin. Browser clients cannot write
administrator documents. The account email is managed in Firebase Authentication;
passwords are never stored in Firestore or this repository.

## Deployment Boundary

`firebase.json` deliberately declares no Functions, Hosting, or Storage deployment.
Web API configuration in `web/config.js` is public Firebase configuration, not an
administrator credential. Admin rights come only from a protected Firestore document.
No password, service account private key, billing credential or local account DB is
included. Analytics is not imported. Browser balances are never accepted as authority.

Only use `firebase deploy --only firestore:rules --project dovecupdatabase---qa`
after explicit owner authentication and rules review. The deploy target is `spark.rules`.
The older `firestore.rules` file is the read-only intermediate baseline and is not used.
Until the owner publishes `spark.rules`, the new web entry will deliberately refuse
database access and show a copy-rules action. Never use `allow read, write: if true`.

## Build and Test

Use Node 24 locally. Install with pnpm, then `node build.mjs`. Static output is `dist/`.
The production web entry is intended for `/DoveCupHomepage/test/`; all paths are relative.
`node preview.mjs` serves it at localhost:4189. `?emulator=1` only works on loopback;
it replaces the project with `demo-dovecup-qa` and connects to local Auth/Firestore.

Run `node --test test/build.test.mjs` for 4 source/build checks.
Run `pnpm test:rules` for the 6 Firestore emulator integration tests (Java 21 required).
On Windows, a short `jdk.net.unixdomain.tmpdir` may be needed to avoid socket path errors.
`test/seed-ui.mjs` only writes to explicit loopback emulator endpoints and creates fake
UI accounts; it must never be used with a cloud project. No cloud test data was written.

Emulator tests cover owner privacy, role escalation denial, fixed-price pending
submissions, immutable receipts, idempotent verification/refunds, shared owner versus
attendee records, duplicate check-in, reversal, and concurrent last-visit protection.
Browser QA tested two isolated browsers: a member submitted a 10-visit package,
an admin verified it, and a check-in changed the other browser's balance from 10 to 9.

No production Firebase data or local financial database has been copied. Cloud rule
publication and authenticated QA sign-in with the owner's real account still require
owner verification. Never deploy against `dovecupdatabase`.
