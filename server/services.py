"""Account lifecycle, authorization, editorial workflow, and auditing."""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass

from .config import Config
from .db import Database
from .security import digest, hash_password, seal, token, verify_password, verify_totp

ROLE_ACTIONS = {
    "owner": {"write","submit","review","publish","unpublish","rollback","manage_accounts","security"},
    "it_head": {"write","submit","review","publish","unpublish","rollback"},
    "it_assistant": {"write","submit"},
}


def permitted(position: str, action: str) -> bool: return action in ROLE_ACTIONS.get(position, set())


@dataclass
class Principal:
    account_id: int
    position: str
    name: str
    session_hash: str
    csrf: str
    reauthenticated_at: int


class Services:
    def __init__(self, db: Database, config: Config): self.db, self.config = db, config
    def audit(self, db, actor, action, target, detail=None):
        db.execute("INSERT INTO audit_log(actor_id,actor_name,action,target,detail,created_at) VALUES(?,?,?,?,?,?)", (actor.account_id if actor else None, actor.name if actor else "system", action, target, json.dumps(detail or {}), int(time.time())))
    def bootstrap_owner(self, name: str, email: str, password: str, totp_secret: str):
        now = int(time.time())
        with self.db.transaction() as db:
            if db.execute("SELECT 1 FROM accounts WHERE position_id='owner'").fetchone(): raise ValueError("Owner already exists")
            db.execute("INSERT INTO accounts(position_id,display_name,email,password_hash,totp_secret,totp_enrolled_at,state,created_at) VALUES('owner',?,?,?,?,?,'active',?)", (name,email.lower(),hash_password(password),seal(totp_secret,self.config.totp_key),now,now))
            account_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
            self.audit(db, None, "owner.bootstrap", "position:owner", {"account_id": account_id})
    def assign_officer(self, actor: Principal, position: str, name: str, email: str) -> str:
        if actor.position != "owner" or position not in ("it_head","it_assistant"): raise PermissionError("Only the owner may assign officer positions")
        raw = token(); now = int(time.time())
        with self.db.transaction() as db:
            previous = db.execute("SELECT id FROM accounts WHERE position_id=?",(position,)).fetchone()
            if previous:
                aid=previous[0]; db.execute("UPDATE sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL",(now,aid)); db.execute("UPDATE devices SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL",(now,aid)); db.execute("UPDATE auth_tokens SET used_at=? WHERE account_id=? AND used_at IS NULL",(now,aid)); db.execute("DELETE FROM recovery_codes WHERE account_id=?",(aid,)); db.execute("UPDATE accounts SET display_name=?,email=?,password_hash=NULL,totp_secret=NULL,totp_enrolled_at=NULL,state='pending',generation=generation+1 WHERE id=?",(name,email.lower(),aid))
            else:
                db.execute("INSERT INTO accounts(position_id,display_name,email,state,created_at) VALUES(?,?,?,'pending',?)",(position,name,email.lower(),now)); aid=db.execute("SELECT last_insert_rowid()").fetchone()[0]
            db.execute("INSERT INTO auth_tokens(account_id,kind,token_hash,created_at,expires_at) VALUES(?,'activation',?,?,?)",(aid,digest(raw,self.config.session_key),now,now+86400))
            self.audit(db,actor,"officer.assign",f"position:{position}",{"name":name,"account_id":aid})
        return raw
    def activate(self, activation: str, password: str, totp_secret: str, verification_code: str) -> list[str]:
        if not verify_totp(totp_secret, verification_code): raise ValueError("Authenticator verification failed")
        now=int(time.time()); codes=[token(9) for _ in range(10)]
        with self.db.transaction() as db:
            row=db.execute("SELECT t.*,a.state FROM auth_tokens t JOIN accounts a ON a.id=t.account_id WHERE token_hash=? AND kind='activation' AND used_at IS NULL AND expires_at>?",(digest(activation,self.config.session_key),now)).fetchone()
            if not row or row["state"]!="pending": raise ValueError("Activation token is invalid or expired")
            db.execute("UPDATE accounts SET password_hash=?,totp_secret=?,totp_enrolled_at=?,state='active' WHERE id=?",(hash_password(password),seal(totp_secret,self.config.totp_key),now,row["account_id"]))
            db.execute("UPDATE auth_tokens SET used_at=? WHERE id=?",(now,row["id"]))
            db.executemany("INSERT INTO recovery_codes(account_id,code_hash) VALUES(?,?)",[(row["account_id"],digest(code,self.config.session_key)) for code in codes])
            self.audit(db,None,"account.activate",f'account:{row["account_id"]}')
        return codes
    def authenticate(self, email: str, password: str, code: str, session_raw: str, ip: str, ua: str, device_raw: str | None):
        now=int(time.time())
        with self.db.transaction() as db:
            account=db.execute("SELECT * FROM accounts WHERE email=?",(email.lower(),)).fetchone()
            good=account and account["state"]=="active" and account["password_hash"] and verify_password(password,account["password_hash"])
            if good:
                from .security import unseal
                good=verify_totp(unseal(account["totp_secret"],self.config.totp_key),code)
            if not good:
                db.execute("INSERT INTO auth_events(account_id,event,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?)",(account["id"] if account else None,"sign_in_failed",digest(ip,self.config.session_key),ua[:200],now)); return None
            device=None; recognized=False
            if device_raw:
                device=db.execute("SELECT * FROM devices WHERE token_hash=? AND account_id=? AND revoked_at IS NULL AND expires_at>?",(digest(device_raw,self.config.session_key),account["id"],now)).fetchone(); recognized=bool(device)
            new_device=None
            if not device:
                new_device=token(); db.execute("INSERT INTO devices(account_id,token_hash,label,first_seen_at,last_seen_at,expires_at) VALUES(?,?,?,?,?,?)",(account["id"],digest(new_device,self.config.session_key),ua[:100] or "Browser",now,now,now+self.config.device_seconds)); device_id=db.execute("SELECT last_insert_rowid()").fetchone()[0]
            else: device_id=device["id"]; db.execute("UPDATE devices SET last_seen_at=? WHERE id=?",(now,device_id))
            csrf=token(); db.execute("INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?,NULL)",(digest(session_raw,self.config.session_key),account["id"],digest(csrf,self.config.session_key),device_id,now,now,now,now+self.config.session_seconds))
            db.execute("INSERT INTO auth_events(account_id,event,ip_hash,user_agent,detail,created_at) VALUES(?,?,?,?,?,?)",(account["id"],"new_device_sign_in" if not recognized else "sign_in_success",digest(ip,self.config.session_key),ua[:200],json.dumps({"device_id":device_id}),now))
            return dict(account),csrf,new_device
    def principal(self, session_raw: str | None, csrf_raw: str | None = None) -> Principal | None:
        if not session_raw:return None
        now=int(time.time())
        with self.db.connect() as db:
            row=db.execute("SELECT s.*,a.position_id,a.display_name,a.state FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.id_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND a.state='active'",(digest(session_raw,self.config.session_key),now)).fetchone()
            if not row:return None
            if csrf_raw is not None and not __import__('hmac').compare_digest(row["csrf_hash"],digest(csrf_raw,self.config.session_key)): raise PermissionError("Invalid CSRF token")
            db.execute("UPDATE sessions SET last_seen_at=? WHERE id_hash=?",(now,row["id_hash"])); db.commit()
            return Principal(row["account_id"],row["position_id"],row["display_name"],row["id_hash"],csrf_raw or "",row["reauthenticated_at"])
    def transition(self, actor: Principal, collection: str, stable_id: str, payload: dict | None, action: str, note=""):
        requirement={"save":"write","submit":"submit","approve":"review","reject":"review","publish":"publish","rollback":"rollback"}.get(action)
        if not requirement or not permitted(actor.position,requirement): raise PermissionError("Action is not allowed for this position")
        now=int(time.time())
        if action in {"approve","publish","rollback"} and now-actor.reauthenticated_at>self.config.reauth_seconds: raise PermissionError("Recent reauthentication required")
        with self.db.transaction() as db:
            previous=db.execute("SELECT * FROM revisions WHERE collection_id=? AND stable_id=? ORDER BY revision DESC LIMIT 1",(collection,stable_id)).fetchone()
            states={"save":"draft","submit":"submitted","approve":"approved","reject":"rejected","publish":"published","rollback":"rolled_back"}; state=states[action]
            if action in {"approve","reject"} and (not previous or previous["state"]!="submitted"): raise ValueError("Only submitted drafts can be reviewed")
            if action=="publish" and (not previous or previous["state"]!="approved"): raise ValueError("Only approved revisions can be published")
            body=payload if payload is not None else json.loads(previous["payload_json"] if previous else "{}")
            revision=(previous["revision"]+1 if previous else 1)
            db.execute("INSERT INTO revisions(collection_id,stable_id,revision,state,payload_json,author_id,reviewer_id,note,created_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?)",(collection,stable_id,revision,state,json.dumps(body),actor.account_id,actor.account_id if action in {'approve','reject'} else None,note,now,now if action=='publish' else None))
            if action=='publish': db.execute("UPDATE records SET published_json=?,enabled=?,position=? WHERE collection_id=? AND stable_id=?",(json.dumps(body),int(body.get('enabled',True)),int(body.get('order',0)),collection,stable_id))
            self.audit(db,actor,f"content.{action}",f"{collection}:{stable_id}",{"revision":revision})
            return revision
    def store_media(self, actor: Principal, original_name: str, data: bytes, alt_text: str, signatures: dict[bytes,str]):
        if not permitted(actor.position,"write"): raise PermissionError("Media upload is not allowed")
        if not alt_text.strip(): raise ValueError("Alternative text is required")
        if not data or len(data)>self.config.max_upload_bytes: raise ValueError("Upload size is not allowed")
        media_type=next((kind for signature,kind in signatures.items() if data.startswith(signature)),None)
        if not media_type or (media_type=="image/webp" and data[8:12]!=b"WEBP"): raise ValueError("File signature is not an approved media type")
        extension={"image/png":".png","image/jpeg":".jpg","image/gif":".gif","image/webp":".webp","application/pdf":".pdf"}[media_type]
        storage_name=uuid.uuid4().hex+extension; target=self.config.media_dir/storage_name
        with open(target,"xb") as stream: stream.write(data)
        now=int(time.time())
        try:
            with self.db.transaction() as db:
                db.execute("INSERT INTO media(storage_name,original_name,media_type,bytes,alt_text,metadata_json,uploader_id,created_at) VALUES(?,?,?,?,?,'{}',?,?)",(storage_name,original_name[:255],media_type,len(data),alt_text.strip(),actor.account_id,now)); media_id=db.execute("SELECT last_insert_rowid()").fetchone()[0]; self.audit(db,actor,"media.upload",f"media:{media_id}",{"storage_name":storage_name})
        except Exception: target.unlink(missing_ok=True); raise
        return storage_name
    def delete_media(self, actor: Principal, media_id: int):
        if not permitted(actor.position,"write"): raise PermissionError("Media deletion is not allowed")
        with self.db.transaction() as db:
            item=db.execute("SELECT * FROM media WHERE id=? AND deleted_at IS NULL",(media_id,)).fetchone()
            if not item: raise ValueError("Media does not exist")
            if db.execute("SELECT 1 FROM media_references WHERE media_id=?",(media_id,)).fetchone(): raise ValueError("Referenced media cannot be deleted")
            db.execute("UPDATE media SET deleted_at=? WHERE id=?",(int(time.time()),media_id)); self.audit(db,actor,"media.delete",f"media:{media_id}")
        (self.config.media_dir/item["storage_name"]).unlink(missing_ok=True)
