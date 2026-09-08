"""Idempotent migration from the GitHub Pages JavaScript data contract."""
from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path

from .db import Database

VARIABLES = {
    "SITE_CONFIG": "site-config.js", "ANNOUNCEMENTS": "announcements.js",
    "GALLERY_ITEMS": "gallery.js", "NAVIGATION": "navigation.js", "SITE_CONTENT": "content.js",
}


def _records(value):
    if isinstance(value, list): return value
    if isinstance(value, dict):
        output = []
        for key, child in value.items():
            if isinstance(child, list):
                output.extend(dict(item, _group=key) if isinstance(item, dict) else {"id": f"{key}-{i}", "value": item, "_group": key} for i, item in enumerate(child))
            else: output.append({"id": key, "value": child})
        return output
    return [{"id": "value", "value": value}]


def import_static_data(database: Database, root: Path) -> dict[str, int]:
    seed = root / "data/seed.json"
    if seed.is_file():
        document = json.loads(seed.read_text(encoding="utf-8"))
    else:
        result = subprocess.run(["node", str(root / "tools/export_static_data.js"), str(root)], check=True, capture_output=True, text=True, timeout=10)
        document = json.loads(result.stdout)
    changed = 0; total = 0; now = int(time.time())
    with database.transaction() as db:
        for collection, source in VARIABLES.items():
            value = document.get(collection, {})
            checksum = hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
            old = db.execute("SELECT imported_hash FROM collections WHERE id=?", (collection,)).fetchone()
            if old and old[0] == checksum:
                total += db.execute("SELECT COUNT(*) FROM records WHERE collection_id=?", (collection,)).fetchone()[0]; continue
            db.execute("INSERT INTO collections VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_file=excluded.source_file, imported_hash=excluded.imported_hash, imported_at=excluded.imported_at", (collection, source, checksum, now))
            incoming = set()
            source_records = [{"id": "config", "value": value}] if collection == "SITE_CONFIG" else _records(value)
            for index, record in enumerate(source_records):
                stable_id = str(record.get("id", record.get("key", index))); incoming.add(stable_id)
                order = int(record.get("order", index)); enabled = int(record.get("enabled", True)); payload = json.dumps(record, separators=(",", ":"), ensure_ascii=False)
                db.execute("INSERT INTO records VALUES(?,?,?,?,?) ON CONFLICT(collection_id,stable_id) DO UPDATE SET position=excluded.position,enabled=excluded.enabled,published_json=excluded.published_json", (collection, stable_id, order, enabled, payload))
                total += 1
            if incoming:
                placeholders = ",".join("?" * len(incoming)); db.execute(f"DELETE FROM records WHERE collection_id=? AND stable_id NOT IN ({placeholders})", (collection, *incoming))
            changed += 1
    return {"collections_changed": changed, "records": total}


def browser_value(database: Database, collection: str):
    with database.connect() as db: rows=db.execute("SELECT published_json FROM records WHERE collection_id=? AND enabled=1 ORDER BY position,stable_id",(collection,)).fetchall()
    records=[json.loads(row[0]) for row in rows]
    if collection in {"ANNOUNCEMENTS","GALLERY_ITEMS","NAVIGATION"}: return records
    if collection=="SITE_CONFIG": return records[0]["value"] if records else {}
    if collection=="SITE_CONTENT":
        value={}
        for record in records:
            group=record.pop("_group",None)
            if group:value.setdefault(group,[]).append(record)
        return value
    return records
