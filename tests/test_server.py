"""Server security, migration, workflow, and public parity coverage."""
from __future__ import annotations

import os
import tempfile
import time
import unittest
from pathlib import Path

from server.config import Config
from server.db import Database
from server.importer import browser_value, import_static_data
from server.security import generate_totp_secret, hash_password, seal, totp, unseal, verify_password, verify_totp
from server.services import Principal, Services, permitted

ROOT=Path(__file__).resolve().parents[1]


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); state=Path(self.temp.name)
        self.config=Config(root=ROOT,database=state/'db.sqlite3',media_dir=state/'media',session_key=b'session-test-key',totp_key=b'totp-test-key',owner_email='owner@example.invalid',public_origin='http://localhost:8000',trusted_proxies=('127.0.0.1',),secure_cookies=False,smtp_host='',smtp_port=587,smtp_user='',smtp_password='',smtp_sender='')
        self.config.media_dir.mkdir(); self.db=Database(self.config.database); self.db.initialize(); self.services=Services(self.db,self.config)
    def tearDown(self):self.temp.cleanup()
    def test_password_totp_and_encrypted_secret(self):
        encoded=hash_password('long test password'); self.assertTrue(verify_password('long test password',encoded)); self.assertFalse(verify_password('incorrect password',encoded))
        secret=generate_totp_secret(); self.assertTrue(verify_totp(secret,totp(secret))); self.assertEqual(unseal(seal(secret,b'key'),b'key'),secret)
    def test_exactly_three_positions_and_permissions(self):
        with self.db.connect() as db:self.assertEqual([r[0] for r in db.execute('SELECT id FROM positions ORDER BY id')],['it_assistant','it_head','owner'])
        self.assertTrue(permitted('it_assistant','write')); self.assertTrue(permitted('it_assistant','submit'))
        for forbidden in ('review','publish','unpublish','rollback','manage_accounts'):self.assertFalse(permitted('it_assistant',forbidden))
        self.assertTrue(permitted('it_head','publish')); self.assertFalse(permitted('it_head','manage_accounts')); self.assertTrue(permitted('owner','manage_accounts'))
    def test_idempotent_import_preserves_browser_records(self):
        first=import_static_data(self.db,ROOT); second=import_static_data(self.db,ROOT)
        self.assertGreater(first['records'],20); self.assertEqual(second['collections_changed'],0)
        with self.db.connect() as db:
            announcement=db.execute("SELECT published_json,enabled,position FROM records WHERE collection_id='ANNOUNCEMENTS' ORDER BY position LIMIT 1").fetchone()
        self.assertIsNotNone(announcement); self.assertIn('Unit updates',announcement[0]); self.assertEqual(announcement[1],1)
        self.assertIn('teams',browser_value(self.db,'SITE_CONTENT')); self.assertIn('identity',browser_value(self.db,'SITE_CONFIG'))
    def test_officer_replacement_revokes_security_material_preserves_audit(self):
        self.services.bootstrap_owner('Owner','owner@example.org','owner password is strong',generate_totp_secret())
        with self.db.connect() as db: owner=db.execute("SELECT * FROM accounts WHERE position_id='owner'").fetchone()
        principal=Principal(owner['id'],'owner','Owner','console','',int(time.time()))
        first=self.services.assign_officer(principal,'it_head','Bhuvan Dasari','bhuvan@example.org')
        secret=generate_totp_secret(); self.services.activate(first,'officer password strong',secret,totp(secret))
        with self.db.connect() as db:
            aid=db.execute("SELECT id FROM accounts WHERE position_id='it_head'").fetchone()[0]; now=int(time.time()); db.execute("INSERT INTO devices(account_id,token_hash,label,first_seen_at,last_seen_at,expires_at) VALUES(?,?,?,?,?,?)",(aid,'device','browser',now,now,now+100)); db.execute("INSERT INTO sessions(id_hash,account_id,csrf_hash,device_id,created_at,last_seen_at,reauthenticated_at,expires_at) VALUES(?,?,?,?,?,?,?,?)",('session',aid,'csrf',db.execute('SELECT last_insert_rowid()').fetchone()[0],now,now,now,now+100)); db.commit()
        self.services.assign_officer(principal,'it_head','Replacement','new@example.org')
        with self.db.connect() as db:
            self.assertIsNotNone(db.execute("SELECT revoked_at FROM sessions WHERE id_hash='session'").fetchone()[0]); self.assertIsNotNone(db.execute("SELECT revoked_at FROM devices WHERE token_hash='device'").fetchone()[0]); self.assertGreaterEqual(db.execute("SELECT COUNT(*) FROM audit_log WHERE target='position:it_head'").fetchone()[0],2)
    def test_editor_cannot_review_or_publish(self):
        editor=Principal(3,'it_assistant','Editor','s','',int(time.time()))
        with self.assertRaises(PermissionError):self.services.transition(editor,'SITE_CONTENT','x',{},'publish')
    def test_static_pages_and_pdfs_remain_in_place(self):
        for path in ('index.html','404.html','pages/contact.html','crm-3rd_edition.pdf','CFM 12th Edition Master Draft (0509-LP-002-6028) 17 APR 2024.pdf'):self.assertTrue((ROOT/path).is_file(),path)
        self.assertIn("Staff Administration",(ROOT/'script.js').read_text())
    def test_media_signature_alt_text_and_generated_name(self):
        self.services.bootstrap_owner('Owner','owner@example.org','owner password is strong',generate_totp_secret())
        with self.db.connect() as db: account=db.execute("SELECT id FROM accounts WHERE position_id='owner'").fetchone()[0]
        owner=Principal(account,'owner','Owner','console','',int(time.time()))
        with self.assertRaises(ValueError):self.services.store_media(owner,'x.png',b'not an image','Alt',{b'\x89PNG\r\n\x1a\n':'image/png'})
        with self.assertRaises(ValueError):self.services.store_media(owner,'x.png',b'\x89PNG\r\n\x1a\nbytes','',{b'\x89PNG\r\n\x1a\n':'image/png'})
        name=self.services.store_media(owner,'unsafe name.png',b'\x89PNG\r\n\x1a\nbytes','Descriptive alt',{b'\x89PNG\r\n\x1a\n':'image/png'}); self.assertNotIn('unsafe',name); self.assertTrue((self.config.media_dir/name).exists())


if __name__=='__main__':unittest.main()
