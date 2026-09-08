"""SQLite schema and transactional persistence."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path

SCHEMA = r"""
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS positions(id TEXT PRIMARY KEY CHECK(id IN ('owner','it_head','it_assistant')), title TEXT NOT NULL, capabilities TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY, position_id TEXT NOT NULL UNIQUE REFERENCES positions(id), display_name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT, totp_secret TEXT, totp_enrolled_at INTEGER, state TEXT NOT NULL CHECK(state IN ('pending','active','disabled')), generation INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(id_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), csrf_hash TEXT NOT NULL, device_id INTEGER REFERENCES devices(id), created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, reauthenticated_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER);
CREATE TABLE IF NOT EXISTS devices(id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), token_hash TEXT NOT NULL UNIQUE, label TEXT NOT NULL, first_seen_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER);
CREATE TABLE IF NOT EXISTS auth_tokens(id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL CHECK(kind IN ('activation','recovery')), token_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER);
CREATE TABLE IF NOT EXISTS recovery_codes(id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), code_hash TEXT NOT NULL, used_at INTEGER);
CREATE TABLE IF NOT EXISTS auth_events(id INTEGER PRIMARY KEY, account_id INTEGER REFERENCES accounts(id), event TEXT NOT NULL, ip_hash TEXT, user_agent TEXT, detail TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS collections(id TEXT PRIMARY KEY, source_file TEXT NOT NULL, imported_hash TEXT NOT NULL, imported_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS records(collection_id TEXT NOT NULL REFERENCES collections(id), stable_id TEXT NOT NULL, position INTEGER NOT NULL, enabled INTEGER NOT NULL, published_json TEXT NOT NULL, PRIMARY KEY(collection_id, stable_id));
CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY, collection_id TEXT NOT NULL, stable_id TEXT NOT NULL, revision INTEGER NOT NULL, state TEXT NOT NULL CHECK(state IN ('draft','submitted','approved','rejected','published','rolled_back')), payload_json TEXT NOT NULL, author_id INTEGER NOT NULL REFERENCES accounts(id), reviewer_id INTEGER REFERENCES accounts(id), note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, published_at INTEGER, UNIQUE(collection_id,stable_id,revision));
CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES accounts(id), actor_name TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS media(id INTEGER PRIMARY KEY, storage_name TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, media_type TEXT NOT NULL, bytes INTEGER NOT NULL, alt_text TEXT NOT NULL, metadata_json TEXT NOT NULL, uploader_id INTEGER NOT NULL REFERENCES accounts(id), created_at INTEGER NOT NULL, deleted_at INTEGER);
CREATE TABLE IF NOT EXISTS media_references(media_id INTEGER NOT NULL REFERENCES media(id), revision_id INTEGER NOT NULL REFERENCES revisions(id), PRIMARY KEY(media_id,revision_id));
"""


class Database:
    def __init__(self, path: Path): self.path = path
    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA journal_mode=WAL")
        return connection
    def initialize(self) -> None:
        with self.connect() as db:
            db.executescript(SCHEMA)
            db.executemany("INSERT OR IGNORE INTO positions VALUES(?,?,?)", [
                ("owner", "Protected owner", "*") ,
                ("it_head", "IT Head / publisher", "content.write,content.submit,content.review,content.publish,content.rollback"),
                ("it_assistant", "IT Assistant / editor", "content.write,content.submit"),
            ])
    @contextmanager
    def transaction(self):
        db = self.connect()
        try:
            db.execute("BEGIN IMMEDIATE"); yield db; db.commit()
        except Exception:
            db.rollback(); raise
        finally: db.close()
