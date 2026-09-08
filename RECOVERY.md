# Owner recovery and restoration runbook

This runbook is intended for the owner administrator. Keep an offline printed copy with the encrypted-backup credentials; never put those credentials in this repository.

## Daily automatic backups

1. The backup service asks SQLite for an online, application-consistent snapshot.
2. It runs SQLite `PRAGMA integrity_check`, encrypts database and media through Restic, verifies repository integrity, and applies 7 daily, 5 weekly, and 12 monthly retention by default.
3. Point `RESTIC_REPOSITORY` at storage outside the rented server (SFTP, S3-compatible object storage, or another supported backend). Restic encrypts content before transfer.
4. Monitor the backup container and alert if a daily successful run is absent. Perform a test restore quarterly and after a major schema change.

## Restore after loss or corruption

1. Stop the application and preserve the damaged volumes for investigation.
2. Provision a clean host, check out the audited release, copy in the private `.env`, and create empty database/media volumes.
3. Run `docker compose run --rm backup /scripts/restore.sh --confirm-overwrite latest`. The script refuses an unconfirmed overwrite and verifies database integrity before replacement.
4. Start with `docker compose up -d`; confirm `/health/live` and `/health/ready` both return HTTP 200.
5. Sign in as owner with password and TOTP. Inspect the security dashboard, all three position states, published public pages, PDFs, and representative media.
6. Revoke all active sessions and devices if compromise—not hardware loss—caused the recovery. Replace the session and TOTP encryption keys only through a planned credential rotation because changing the latter invalidates enrolled authenticators.
7. Record who restored which snapshot, the verification results, and the incident in the owner’s off-system operations log.

## Account emergency

Use an unused recovery code only from a trusted device. Recovery initiation belongs solely to the owner for officer positions. Replacing an officer revokes every session, device, activation token, and recovery token for that position but preserves historical audit attribution. If the protected owner loses both TOTP and all recovery codes, use console access and the separately controlled emergency procedure; never ask an officer to modify the owner record.
