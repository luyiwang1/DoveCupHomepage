# Production Signup Snapshot

Copied from the production checkout at commit d4ee1a5 on 2026-11-01.
`signup.html`, `language.js` and `venue-config.js` retain the production source
(line endings and an optional UTF-8 BOM are not significant).

The sandbox server removes Firebase SDK loading and the original startup calls.
It adds `signup-live-runtime.js` to connect the unchanged page renderers and
dialogs to the authenticated local API. No production data is loaded or written.

Intentional differences:
- A test-environment banner and a non-deliverable test payment address.
- Account login is mandatory for registration; account identity owns each booking.
- Admin uses the logged-in account role and the sandbox admin workspace, not 8888.
- Confirmation of participation is not actual attendance and never deducts visits.

Update these snapshots deliberately when the production signup UI changes.
