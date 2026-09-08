#!/bin/sh
set -eu
while true; do
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  # SQLite's online backup API produces an application-consistent database copy.
  python3 -c "import sqlite3; s=sqlite3.connect('/source/database/site.sqlite3'); d=sqlite3.connect('/staging/site-$timestamp.sqlite3'); s.backup(d); d.execute('PRAGMA integrity_check').fetchone()[0]=='ok' or exit(2); d.close(); s.close()"
  restic backup /staging/site-"$timestamp".sqlite3 /source/media --tag automated
  restic check --read-data-subset=5%
  restic forget --prune --keep-daily "${RESTIC_KEEP_DAILY:-7}" --keep-weekly "${RESTIC_KEEP_WEEKLY:-5}" --keep-monthly "${RESTIC_KEEP_MONTHLY:-12}"
  rm -f /staging/site-"$timestamp".sqlite3
  sleep 86400
done
