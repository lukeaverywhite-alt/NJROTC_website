# Security and editorial design

## Fixed positions and account lifecycle

The database permits exactly three position identifiers: protected `owner`, `it_head`, and `it_assistant`. A unique account row occupies each position. The owner alone may assign or replace either officer. Replacement increments the position generation and transactionally revokes sessions, devices, activation and recovery tokens while retaining immutable audit rows and their display-name attribution. Officer-facing routes cannot modify the owner.

Create the protected owner from the server console, then privately create the two initial assignments (no password, TOTP secret, token, or email credential is committed):

```sh
python -m server.manage bootstrap-owner --name "Owner name" --email owner@example.org
python -m server.manage assign-officer it_head --name "Bhuvan Dasari" --email privately-configured@example.org
python -m server.manage assign-officer it_assistant --name "Caleb Metcalf" --email privately-configured@example.org
```

Activation is time limited and requires a new password plus successful enrollment-code verification. Passwords use parameterized scrypt, TOTP secrets are authenticated-encrypted with an independent deployment key, sessions and device registrations are server-side, and recovery codes and all bearer tokens are stored only as keyed hashes. There is no registration endpoint.

The assignee first runs `python -m server.manage new-totp --email THEIR_PRIVATE_EMAIL`, adds the displayed URI to Google Authenticator or another compatible app, then uses `python -m server.manage activate --token PRIVATE_TOKEN --secret DISPLAYED_SECRET --code CURRENT_CODE`. The password is read without echo (or supplied in the private `ACTIVATION_PASSWORD` environment variable for automation).

## Authorization and content

Every mutation passes through server-side role checks. Owner and IT Head can draft, submit, review, publish and roll back. IT Assistant can only draft and submit. Approval, publication, and rollback also require a session reauthenticated within ten minutes. JSON payloads are validated as objects and written as data—not evaluated as code. Browser editing is deliberately limited to managed records and uploaded media; templates, CSS, JavaScript, Python, and SQL are not exposed.

The idempotent importer reads the trusted legacy `data/*.js` sources into structured SQLite records. Those files remain during the GitHub Pages fallback period. Checksums avoid needless repeat imports, while stable IDs, group membership, ordering, enabled states, dates, verification fields, and the complete browser-facing payload remain intact.

Uploads must pass size and file-signature checks. Generated UUID storage names and `nosniff` responses prevent attacker-selected executable paths. Alternative text is required, metadata is stored separately, and referenced media cannot be deleted until its content references are removed.

## Operational controls

The owner-only security dashboard exposes the three position states, TOTP enrollment, active session counts, recent sign-ins, failures, and browser labels. Successful new-device sign-ins and failed authentication create dashboard events and immediate owner email. Operators should configure a transactional SMTP account and alert on delivery failures. Proxy headers are honored only from `TRUSTED_PROXIES`.

Administrative responses are marked `noindex, nofollow, noarchive`. TLS terminates at Caddy, administration rejects non-HTTPS forwarded requests in production, cookies are `Secure`, `HttpOnly`, and `SameSite=Strict`, and mutating requests require a server-bound CSRF token.
