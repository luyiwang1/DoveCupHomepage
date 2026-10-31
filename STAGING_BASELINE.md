# Member System Test Environment

- Production source cloned from `https://github.com/luyiwang1/DoveCupHomepage.git`.
- Baseline commit: `467f1ec4cd756d25fbbc6e708117d524baae41e7`.
- Local snapshot: `snapshot/production-2026-10-31`.
- Test branch: `test/member-accounts`.
- Production checkout and Firebase data must not be changed by this test environment.
- Origin fetch remains available, but its push URL is disabled and `push.default=nothing`.
- No automatic release is scheduled for November 7. Deployment requires explicit approval after the event.
- Test data are synthetic, stored under `sandbox/.data`, and excluded from Git.
- This server uses SQLite as the shared test backend. It is not the production Firebase project and does not perform any Firebase requests.

See `sandbox/README.md` for startup, credentials, test coverage and the eventual release checklist.
