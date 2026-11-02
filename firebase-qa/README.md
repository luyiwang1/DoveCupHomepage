# Full Firebase QA

This replaces neither production nor the simplified legacy `firebase-staging` prototype.

## Scope

- Project: **dovecupdatabase---qa only**. Never deploy to `dovecupdatabase`.
- Preserve the complete sandbox UI, Chinese usernames, password visibility, registration chains, courts, attendance, tournaments, packages, sharing and admin tools.
- Firebase Hosting serves the existing pages. Cloud Functions runs the existing username/password and session service. No user email or synthetic email identities are introduced.
- Realtime Database is the durable authority. Its client rules deny **all** direct reads and writes; only the function's service identity accesses private data.
- This first QA compatibility adapter stores a versioned, server-private JSON state at `memberSystemQA/state`. SQL executes only in request-local memory. It does not rely on a local disk surviving function shutdown.
- Writes use cloud compare-and-swap, retry from fresh state on conflicts and withhold all responses/cookies until commit. Existing SQL constraints and financial transactions still apply. No bank action or automatic receipt verification is added.
- This is a small-QA migration adapter, **not a production-scalable per-record RTDB repository**. Every API request reads a full state; large histories or frequent polling increase bandwidth. Maximum payload is 8 MiB. Measure costs and redesign per-record storage before production or broad testing.
- Cloud Functions has `minInstances: 0`, `maxInstances: 1`, `concurrency: 1`. Cold starts can delay the first request, but no manual Codespaces resume is needed.
- Authentication is the existing server-side hashed-password/session implementation hosted on Firebase Functions, not Firebase Authentication. A separate Auth integration is not required for server-only database access. Do not describe this as an implemented Firebase Auth/custom-token flow.

## Before deployment

1. The owner must enable Blaze and create **Realtime Database** in the QA project. Existing QA Firestore is a different database and is not modified.
2. Record the exact QA database URL. No credentials or billing details in Git or chat.
3. Keep the Codespace and its SQLite backup. Before final export, stop new QA edits to avoid divergent histories. Do not import local Windows demo data.
4. Run all sandbox and cloud tests. Build using `node firebase-qa/build.mjs` from repository root.
5. In the generated `firebase-qa/dist/functions` directory, install dependencies with the normal package manager, with lifecycle scripts disabled. Verify the Node 22 runtime locally/emulated before deployment.
6. Log the Firebase CLI into the owner's Google account privately. Deployment requires explicit QA project flags; never use an ambient project default.
7. From `firebase-qa/dist`, set `DOVE_QA_SESSION_SECRET` with `firebase functions:secrets:set DOVE_QA_SESSION_SECRET --project dovecupdatabase---qa`. Generate a new random 32+ byte secret privately. Do not paste it into chat. Set `DOVE_QA_IMPORT_SECRET` from the existing Codespace private `sandbox/.data/cloud-qa/owner-setup-code` file using the CLI's `--data-file` option, without printing its contents. This is a migration credential, not a member/admin password.
8. Set `DOVE_QA_DATABASE_URL` to the exact QA URL when the CLI asks. The function validates the QA project and database hostname.
9. Back up existing QA RTDB rules/data before publishing these deny-all rules. They apply to the entire **QA RTDB**, never the production project. Do not overwrite other QA app data without reviewing it.
10. Run `node firebase-qa/prepare-import.mjs` on the Codespace holding the registered Wang Ge account. It creates a private file outside the deployed directories, excludes sessions, and preserves password hashes/IDs/records. Never publish or commit the file.
11. Deploy only this `full-member-qa` codebase, QA Hosting and QA RTDB rules. Import is not automatic during deployment.
12. On the Codespace run `node firebase-qa/import-cloud.mjs <private-file>` with the file from step 10. The fixed QA HTTPS endpoint checks the migration secret, schema, unique Wang Ge administrator and empty sessions, then creates cloud state with a transaction only if absent. A repeated import returns 409; an unconditional `database:set` is forbidden. Do not overwrite initialized cloud state.
13. Verify the complete flows at `https://dovecupdatabase---qa.web.app` before replacing any shared test links. The old Codespace remains a rollback copy, but must not receive further writes while Firebase is the active QA environment.

## Required acceptance

- Chinese registration and login, original Wang Ge password works, admin role retained.
- Close/reopen browser and sign in from a second device; member IDs and records unchanged.
- Other members cannot edit registrations, read private finances or grant themselves admin.
- Direct anonymous/client database access denied.
- Single $40 / package $350 submission, admin correction/verification/refund, duplicate requests.
- Shared Nina/Vivi use deducts from the owner but records the actual attendee; concurrent last visit cannot go negative.
- Password changes/recovery invalidate all old sessions. Account deletion retains anonymous audit/financial references.
- Signup capacities, waitlist promotion, courts revisions, tournament operations and actual attendance match the original sandbox.
- No production Firebase requests, no production writes, no test fixtures in the deployed DB.
- No success response when persistence fails; API replies 503/409, never silently falls back to local state.
- Backups and rollback tested privately. Codespaces and Firebase diverge after switching; never merge them automatically.

## Billing

Blaze billing must be enabled by the owner. Budget alerts are not hard spending caps. Maximum instances and rate limits reduce risk, but do not guarantee a fixed maximum bill. Review actual QA bandwidth before promising a monthly estimate.
