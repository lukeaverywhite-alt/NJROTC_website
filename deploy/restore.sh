#!/bin/sh
set -eu
test "${1:-}" = "--confirm-overwrite" || { echo "Usage: $0 --confirm-overwrite [snapshot]"; exit 2; }
snapshot="${2:-latest}"
mkdir -p /restore
restic check
restic restore "$snapshot" --target /restore
db="$(find /restore -name 'site-*.sqlite3' | sort | tail -1)"
python3 -c "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok'" "$db"
cp "$db" /data/site.sqlite3
rm -rf /media/*
cp -a /restore/source/media/. /media/
echo "Restore complete. Start the application and follow RECOVERY.md verification steps."
