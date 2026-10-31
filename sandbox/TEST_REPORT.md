# Member Sandbox Verification

Date: 2026-10-31, America/Toronto.

## Automated

- 13 isolated backend/domain/API tests pass (`node --test test/*.test.mjs`).
- 119 original website tests pass (`node --test scripts/*.test.mjs scripts/*.test.cjs` from the clone root).
- Tests use in-memory or independently named temporary SQLite databases, not the preview database and never production Firebase.

Covered behaviors:

- Unique usernames, permanent member IDs, password hashes, no client-selected administrator role.
- Correct/wrong credentials, one-time recovery, old session revocation after password changes, including replay of an old session row.
- Cookie session survives a server restart; logout invalidates its session without destroying another device's session.
- Server-side owner checks and admin role checks; CSRF tokens and cross-origin mutation rejection; private account responses contain no password/recovery hashes.
- NYTA four-per-division / twelve-total capacity, eligible waitlist promotion, no cancellation of another user's booking.
- Pending payments do not create receipts/visits, correction does not verify, repeated verification creates one receipt.
- Shared package access is explicit; a member cannot share someone else's package; revoked access blocks future use.
- Nina and Vivi consume two visits from one package, remain separate attendees, and generate no second payment.
- Duplicate attendance is idempotent; competing requests for the final visit cannot make the package negative.
- Reversal returns visits to the original package, duplicate reversal/refund is idempotent, used packages cannot be refunded until check-ins are reversed.
- Legacy claims require admin approval; no automatic ownership from names/tails; original signup timestamp is preserved.
- Archive changes no attendance or package totals; migration preview writes zero rows.

## Browser

Chrome/Playwright with separate cookie contexts and a separate QA server/database:

- Copied homepage retains the existing photos, video and design, with a testing banner and sign-in/account navigation.
- No production Firebase requests from the copied homepage. CSP restricts backend connections to the same test server.
- Nina desktop account: 10 initial visits, 0 attendance, simulated payment350.
- Independent Nina mobile-sized session sees the same account and booking.
- Admin checks in Nina and Vivi: Nina's independent session reads8 visits and1 own attendance; admin reads2 attendance and simulated receipts350.
- Vivi sees the authorized shared balance but no Nina private payment records.
- New user registration, private recovery-code display, package signup, pending payment submission, division edit and recovery using a separate browser context succeed.
- Recovery keeps the same member ID; the earlier authenticated session returns401.
- Mobile390px Chinese/English account, sharing and settings layouts have no horizontal overflow; desktop1440px admin layout visually checked.
- No page JavaScript errors in the new-member workflow.

## Not Claimed as Done

- No production deployment, real-account linking, bank reconciliation, production ledger import, real SMS/email delivery or public HTTPS test hostname.
- Cross-browser synchronization was tested against one shared test backend. A physical phone cannot reach this machine through its own127.0.0.1.
- Production rollout still requires the release checklist in README.md, a hosting/database choice, administrator credential replacement and a separate authorization/security review.
