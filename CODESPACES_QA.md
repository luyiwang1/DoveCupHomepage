# Full QA With the Same Local Application

## Why This Exists

The Firebase Spark/GitHub Pages prototype under `/test/` was a separate, smaller
email-auth application. It is not the local member sandbox. It cannot run the Node
server or preserve the username/password/recovery-code flow by merely copying HTML.
The owner has rejected email registration and requested full local/cloud parity.

The `.devcontainer/devcontainer.json` configuration runs the existing `sandbox/server.mjs`
in GitHub Codespaces. It reuses the same pages, API routes, business logic and tests:

- Homepage, events and photos.
- Exact live-style signup chain, two venue capacities, account-required ownership.
- Courts, attendance page, singles and team pages.
- Username/password membership, 6-character minimum, private recovery codes, profile.
- Role-based admin workspace, payment correction/verification, shared packages.
- Actual attendance, owner-versus-attendee charges, reversals, refund protections.
- Account deletion guards and protected server sessions.

No Firebase Auth or synthetic email identities are used by this full application.
The prior Firebase QA project and its data are left untouched. The existing local
4187 database and the production site are not uploaded, migrated or replaced.

## Free-Usage Conditions: Owner Must Verify Before Creating

Codespaces is a cloud development preview, not permanent 24/7 hosting. GitHub Free
personal accounts currently include 120 core-hours (about 60 running hours on a
2-core machine) and 15 GB-month storage. Account allowances and organization billing
may differ. This repository cannot set or verify the owner's billing settings.

Do not create the Codespace until the owner confirms included usage is available and
there is no paid usage enabled. If a payment method is present, configure the relevant
Codespaces budget to block usage at zero spending; never rely on a mere budget alert.
Do not add a card, change a billing plan, create paid prebuilds, or select a larger VM.
No Codespace is created automatically by a git push or this code.

Official details:
https://docs.github.com/en/billing/concepts/product-billing/github-codespaces

## Create or Resume

https://codespaces.new/luyiwang1/DoveCupHomepage/tree/test/member-accounts?quickstart=1

Use the `test/member-accounts` branch, the supplied configuration and the 2-core
machine. On creation npm installs runtime dependencies only. On start a detached
Node service launches on port 4187. The full URL is printed in the private terminal:
`https://<codespace-name>-4187.app.github.dev/`.

The port remains private by default. The owner can preview while authenticated to
GitHub. Sharing with testers who do not have GitHub access requires the owner to
explicitly change port 4187 to Public in the Ports panel, after initial setup and
review of the test data. Do not publish database backups or setup codes.

## First Administrator: No Default Password

The cloud database starts empty: no `admin_test`, no public demo password, no fake
income and no copy of the local owner's password hash. Two empty Saturday sessions
are initialized per venue. Use the private setup code found at:

`sandbox/.data/cloud-qa/owner-setup-code`

Open `/owner-setup.html` on the forwarded QA URL. Enter the setup code, a username,
your own password (minimum 6 characters), and the last four phone digits. Save the
one-time private recovery code. The administrator can only be initialized once;
the server enforces this atomically and does not trust a browser role field.

The owner may choose the same username/password as the local account manually;
the code neither reads nor transfers the existing local password. Firebase's QA
administrator UID is not this username account and does not automatically transfer.

## Persistence and Backups

The server stores SQLite, session secrets and setup state in the ignored directory
`sandbox/.data/cloud-qa/`. Codespace stop/resume preserves workspace data, but
deleting the Codespace or expiry of its retention period destroys it. By default,
inactive Codespaces can be automatically deleted after 30 days. Recreating a new
Codespace creates a separate empty test database, not a shared cloud database.

Create a full backup before deleting or replacing it:

```sh
node sandbox/scripts/backup-cloud-qa.mjs
```

Download the generated SQLite file privately. It includes financial records,
members, operational documents and sessions; do not put it in the public repo.
Do not confuse the incomplete admin JSON export with this full database backup.

## Security and Verification

Hosted mode only starts for `CODESPACES=true` plus `DOVE_QA_CODESPACES=1`.
It accepts an exact HTTPS `*.app.github.dev` origin, requires Secure HttpOnly
SameSite=Lax session cookies, retains CSRF checks, and refuses seeded demo accounts.
The local default remains loopback-only and unchanged. Public setup needs both an
unexposed high-entropy setup code and a session CSRF token. The first-admin insert
is serialized so two simultaneous requests cannot create multiple owners.

38 Node tests passed, including hosted HTTPS/cookies/Host/Origin checks,
first-owner races, normal-user role injection denial and full route parity.
Actual Codespace creation, container startup and remote preview still require the
owner's GitHub authorization and have not been verified from this computer.

## Update a Running Codespace

The owner has since created a Codespace and shown the full homepage. A registration
screenshot showed `csrf_invalid`. Codespaces can rewrite a same-origin `Origin`
header to the forwarded loopback port while leaving the public Referer intact.
The hosted server now accepts that rewrite only for the exact forwarded port, HTTPS,
same-origin Fetch Metadata (when supplied), matching public Referer and a valid CSRF
token. Cross-site requests and arbitrary loopback origins remain rejected.

The account client can refresh a stale CSRF token once before retrying a rejected
mutation. It never retries origin errors, server errors, completed mutations or a
request after the signed-in identity has changed. Lost cookies cannot cause a loop.

Pull the updated test branch in the Codespace terminal, then restart only this server:

```sh
git pull --ff-only
node sandbox/scripts/codespaces-restart.mjs
```

The restart helper matches the current user's Node process, exact script path and
working directory, refuses ambiguous matches, and requests graceful shutdown. It
does not delete the SQLite database, recreate the Codespace, or reset any accounts.
Remote registration still needs the owner to verify after pulling this update.
