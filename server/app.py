"""Dependency-free HTTP application serving the unchanged public site and protected administration."""
from __future__ import annotations

import html
import json
import logging
import mimetypes
import os
import smtplib
import ssl
import time
import uuid
from email.message import EmailMessage
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from .config import Config
from .db import Database
from .importer import browser_value, import_static_data
from .security import digest, token
from .services import Principal, Services, permitted

LOG = logging.getLogger("njrotc")
PUBLIC_TOP_LEVEL = {"index.html","404.html","styles.css","script.js","weather.js","crm-3rd_edition.pdf","CFM 12th Edition Master Draft (0509-LP-002-6028) 17 APR 2024.pdf","2024 CRM 4th Edition (0509-LP-002-6029) 18 APR 2024.pdf"}
PUBLIC_DIRS = {"assets","data","pages","references"}
MEDIA_SIGNATURES = {b"\x89PNG\r\n\x1a\n": "image/png", b"\xff\xd8\xff": "image/jpeg", b"GIF87a": "image/gif", b"GIF89a": "image/gif", b"%PDF-": "application/pdf", b"RIFF": "image/webp"}


def configure_logging():
    logging.basicConfig(level=os.environ.get("LOG_LEVEL","INFO"), format='{"time":"%(asctime)s","level":"%(levelname)s","message":%(message)s}')


def send_security_email(config: Config, subject: str, body: str):
    if not config.smtp_host:
        LOG.warning(json.dumps({"event":"email_not_configured","subject":subject})); return
    message=EmailMessage(); message["From"]=config.smtp_sender; message["To"]=config.owner_email; message["Subject"]=subject; message.set_content(body)
    with smtplib.SMTP(config.smtp_host,config.smtp_port,timeout=10) as smtp:
        smtp.starttls(context=ssl.create_default_context())
        if config.smtp_user:smtp.login(config.smtp_user,config.smtp_password)
        smtp.send_message(message)


def page(title: str, body: str, *, csrf="") -> bytes:
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="same-origin"><title>{html.escape(title)} | Bethel NJROTC</title><link rel="stylesheet" href="/styles.css"><style>.admin-shell{{max-width:70rem;margin:auto;padding:2rem 1rem}}.admin-card{{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.25rem;margin:1rem 0}}label{{display:block;margin:.8rem 0 .3rem}}input,textarea,select{{font:inherit;width:100%;max-width:40rem;padding:.7rem;background:var(--surface-deep);color:var(--text-primary);border:1px solid var(--border)}}table{{width:100%;border-collapse:collapse}}th,td{{text-align:left;padding:.65rem;border-bottom:1px solid var(--border)}}.admin-actions{{display:flex;flex-wrap:wrap;gap:.5rem}}button{{padding:.7rem 1rem}}</style></head><body><main id="main-content" class="admin-shell"><a href="/">← Public website</a><h1>{html.escape(title)}</h1>{body}</main></body></html>'''.encode()


class Handler(BaseHTTPRequestHandler):
    server_version="NJROTC/1"
    def log_message(self, fmt, *args):
        LOG.info(json.dumps({"request_id":getattr(self,"request_id",None),"remote":self.client_address[0],"method":self.command,"path":self.path,"message":fmt%args}))
    @property
    def app(self): return self.server.app
    def cookies(self):
        jar=SimpleCookie(); jar.load(self.headers.get("Cookie","")); return {k:v.value for k,v in jar.items()}
    def client_ip(self):
        peer=self.client_address[0]
        if peer in self.app.config.trusted_proxies:
            return self.headers.get("X-Forwarded-For",peer).split(",")[0].strip()
        return peer
    def is_https(self):
        peer=self.client_address[0]
        return self.app.config.public_origin.startswith("https://") and (peer not in self.app.config.trusted_proxies or self.headers.get("X-Forwarded-Proto")=="https")
    def body(self):
        length=int(self.headers.get("Content-Length","0"));
        if length>self.app.config.max_upload_bytes+65536: raise ValueError("Request too large")
        return self.rfile.read(length)
    def form(self): return {k:v[-1] for k,v in parse_qs(self.body().decode(),keep_blank_values=True).items()}
    def respond(self,status,body=b"",content_type="text/html; charset=utf-8",headers=None,admin=False):
        self.send_response(status); self.send_header("Content-Type",content_type); self.send_header("Content-Length",str(len(body)))
        self.send_header("X-Content-Type-Options","nosniff"); self.send_header("X-Frame-Options","DENY"); self.send_header("Referrer-Policy","strict-origin-when-cross-origin"); self.send_header("Permissions-Policy","camera=(), microphone=(), geolocation=()")
        self.send_header("Content-Security-Policy","default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-src https://calendar.google.com; connect-src 'self' https://api.weather.gov; object-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")
        if self.app.config.public_origin.startswith("https://"): self.send_header("Strict-Transport-Security","max-age=63072000; includeSubDomains")
        if admin:self.send_header("X-Robots-Tag","noindex, nofollow, noarchive")
        for k,v in headers or []: self.send_header(k,v)
        self.end_headers()
        if self.command != "HEAD": self.wfile.write(body)
    def redirect(self,url,headers=None): self.respond(303,b"",headers=[("Location",url),*(headers or [])],admin=url.startswith("/admin"))
    def principal(self,csrf=False):
        c=self.cookies(); return self.app.services.principal(c.get("nj_session"),self.headers.get("X-CSRF-Token") or (self._form.get("csrf") if csrf and hasattr(self,"_form") else None))
    def require(self,action=None,csrf=False):
        principal=self.principal(csrf)
        if not principal: self.redirect("/admin/login"); return None
        if action and not permitted(principal.position,action): self.respond(403,page("Forbidden","<p>Your administrative position does not permit this action.</p>"),admin=True); return None
        return principal
    def do_GET(self):
        self.request_id=uuid.uuid4().hex; route=unquote(urlsplit(self.path).path)
        if route=="/health/live": return self.respond(200,b'{"status":"live"}',"application/json")
        if route=="/health/ready":
            try:
                self.app.db.connect().execute("SELECT 1").fetchone(); return self.respond(200,b'{"status":"ready"}',"application/json")
            except Exception:return self.respond(503,b'{"status":"not_ready"}',"application/json")
        if route=="/admin/login":
            if self.app.config.public_origin.startswith("https://") and not self.is_https(): return self.respond(400,page("HTTPS required","<p>Administration is available only over HTTPS.</p>"),admin=True)
            csrf=token(); headers=[("Set-Cookie",f"nj_login_csrf={csrf}; Path=/admin; SameSite=Strict"+("; Secure" if self.app.config.secure_cookies else ""))]
            body=f'<form method="post"><input type="hidden" name="csrf" value="{csrf}"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required><label for="totp">6-digit authenticator code</label><input id="totp" name="totp" inputmode="numeric" pattern="[0-9]{{6}}" autocomplete="one-time-code" required><button type="submit">Sign in</button></form><p>There is no public registration. Contact the protected owner if you hold an assigned position.</p>'
            return self.respond(200,page("Staff Administration",body),headers=headers,admin=True)
        if route=="/admin/logout":
            c=self.cookies(); raw=c.get("nj_session")
            if raw:
                with self.app.db.connect() as db: db.execute("UPDATE sessions SET revoked_at=? WHERE id_hash=?",(int(time.time()),digest(raw,self.app.config.session_key))); db.commit()
            return self.redirect("/",[("Set-Cookie","nj_session=; Path=/admin; Max-Age=0; HttpOnly; SameSite=Strict")])
        if route=="/admin":
            actor=self.require();
            if not actor:return
            with self.app.db.connect() as db:
                records=db.execute("SELECT collection_id,stable_id,enabled,position FROM records ORDER BY collection_id,position").fetchall()
            rows=''.join(f'<tr><td>{html.escape(r[0])}</td><td><a href="/admin/content/{html.escape(r[0])}/{html.escape(r[1])}">{html.escape(r[1])}</a></td><td>{"Yes" if r[2] else "No"}</td></tr>' for r in records)
            links='<a href="/admin/security">Security dashboard</a> · ' if actor.position=='owner' else ''
            return self.respond(200,page("Content administration",f'<p>Signed in as <strong>{html.escape(actor.name)}</strong> ({html.escape(actor.position)}). {links}<a href="/admin/logout">Sign out</a></p><div class="admin-card"><h2>Managed content</h2><table><thead><tr><th>Collection</th><th>Stable ID</th><th>Enabled</th></tr></thead><tbody>{rows}</tbody></table></div>'),admin=True)
        if route=="/admin/security":
            actor=self.require("security");
            if not actor:return
            with self.app.db.connect() as db:
                accounts=db.execute("SELECT a.*, (SELECT COUNT(*) FROM sessions s WHERE s.account_id=a.id AND s.revoked_at IS NULL AND s.expires_at>?) sessions FROM accounts a ORDER BY CASE position_id WHEN 'owner' THEN 0 WHEN 'it_head' THEN 1 ELSE 2 END",(int(time.time()),)).fetchall(); events=db.execute("SELECT e.event,e.created_at,a.display_name,e.user_agent FROM auth_events e LEFT JOIN accounts a ON a.id=e.account_id ORDER BY e.id DESC LIMIT 50").fetchall()
            arows=''.join(f'<tr><td>{html.escape(a["position_id"])}</td><td>{html.escape(a["display_name"])}</td><td>{html.escape(a["state"])}</td><td>{"Yes" if a["totp_enrolled_at"] else "No"}</td><td>{a["sessions"]}</td></tr>' for a in accounts)
            erows=''.join(f'<tr><td>{html.escape(e[0])}</td><td>{html.escape(e[2] or "unknown")}</td><td><time>{time.strftime("%Y-%m-%d %H:%M UTC",time.gmtime(e[1]))}</time></td><td>{html.escape(e[3] or "")}</td></tr>' for e in events)
            return self.respond(200,page("Owner security dashboard",f'<div class="admin-card"><h2>Exactly three positions</h2><table><tr><th>Position</th><th>Assignee</th><th>State</th><th>TOTP</th><th>Sessions</th></tr>{arows}</table></div><div class="admin-card"><h2>Recent authentication activity</h2><table><tr><th>Event</th><th>Account</th><th>Time</th><th>Device</th></tr>{erows}</table></div>'),admin=True)
        if route.startswith("/admin/content/"):
            actor=self.require("write");
            if not actor:return
            parts=route.split("/",4)
            if len(parts)!=5:return self.respond(404,page("Not found","<p>Record not found.</p>"),admin=True)
            collection,stable_id=parts[3:]
            with self.app.db.connect() as db: record=db.execute("SELECT published_json FROM records WHERE collection_id=? AND stable_id=?",(collection,stable_id)).fetchone()
            if not record:return self.respond(404,page("Not found","<p>Record not found.</p>"),admin=True)
            csrf=token(); # rotate session CSRF when opening an edit form
            with self.app.db.connect() as db: db.execute("UPDATE sessions SET csrf_hash=? WHERE id_hash=?",(digest(csrf,self.app.config.session_key),actor.session_hash)); db.commit()
            actions=['save','submit']+(['approve','reject','publish','rollback'] if actor.position in {'owner','it_head'} else [])
            buttons=''.join(f'<button name="action" value="{a}">{a.replace("_"," ").title()}</button>' for a in actions)
            body=f'<p><a href="/admin">Administration</a></p><form method="post"><input type="hidden" name="csrf" value="{csrf}"><label for="payload">Validated JSON record</label><textarea id="payload" name="payload" rows="20" required>{html.escape(json.dumps(json.loads(record[0]),indent=2))}</textarea><label for="note">Review note</label><input id="note" name="note"><div class="admin-actions">{buttons}<button name="action" value="preview" formtarget="_blank">Preview</button></div></form>'
            return self.respond(200,page(f"Edit {stable_id}",body),admin=True)
        if route.startswith("/media/"):
            name=Path(route).name
            with self.app.db.connect() as db: item=db.execute("SELECT * FROM media WHERE storage_name=? AND deleted_at IS NULL",(name,)).fetchone()
            if not item:return self.not_found()
            path=self.app.config.media_dir/name
            if not path.is_file():return self.not_found()
            return self.respond(200,path.read_bytes(),item["media_type"],[("Content-Disposition","inline"),("Cache-Control","public,max-age=31536000,immutable")])
        return self.static(route)
    def do_HEAD(self): self.do_GET()
    def do_POST(self):
        self.request_id=uuid.uuid4().hex; route=unquote(urlsplit(self.path).path)
        try:self._form=self.form()
        except (UnicodeDecodeError,ValueError):return self.respond(400,b"Bad request")
        if route=="/admin/login":
            if self.cookies().get("nj_login_csrf")!=self._form.get("csrf"):return self.respond(403,page("Sign-in failed","<p>The form expired. Try again.</p>"),admin=True)
            session_raw=token(); result=self.app.services.authenticate(self._form.get("email",""),self._form.get("password",""),self._form.get("totp",""),session_raw,self.client_ip(),self.headers.get("User-Agent",""),self.cookies().get("nj_device"))
            if not result:
                send_security_email(self.app.config,"Suspicious NJROTC administration sign-in","A password/TOTP sign-in failed. Review the owner security dashboard immediately.")
                return self.respond(401,page("Sign-in failed","<p>The supplied credentials could not be verified.</p>"),admin=True)
            account,csrf,device=result; flags="; Path=/admin; HttpOnly; SameSite=Strict"+("; Secure" if self.app.config.secure_cookies else "")
            headers=[("Set-Cookie",f"nj_session={session_raw}{flags}")]
            if device: headers.append(("Set-Cookie",f"nj_device={device}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age={self.app.config.device_seconds}"+("; Secure" if self.app.config.secure_cookies else ""))); send_security_email(self.app.config,"New device signed in to NJROTC administration",f'{account["display_name"]} signed in from a new browser. Review or revoke it in the owner security dashboard.')
            return self.redirect("/admin",headers)
        if route.startswith("/admin/content/"):
            actor=self.require(csrf=True)
            if not actor:return
            parts=route.split("/",4); collection,stable_id=parts[3:]; action=self._form.get("action")
            try: payload=json.loads(self._form.get("payload","{}"))
            except json.JSONDecodeError:return self.respond(400,page("Invalid content","<p>Content must be a valid JSON object.</p>"),admin=True)
            if not isinstance(payload,dict):return self.respond(400,page("Invalid content","<p>The record must be a JSON object.</p>"),admin=True)
            if action=="preview": return self.respond(200,page(f"Preview: {stable_id}",f'<div class="admin-card"><pre>{html.escape(json.dumps(payload,indent=2))}</pre></div><p>This preview uses the public stylesheet and remains non-indexable.</p>'),admin=True)
            try:self.app.services.transition(actor,collection,stable_id,payload,action,self._form.get("note",""))
            except PermissionError as exc:return self.respond(403,page("Action denied",f'<p>{html.escape(str(exc))}</p>'),admin=True)
            except ValueError as exc:return self.respond(409,page("Invalid workflow transition",f'<p>{html.escape(str(exc))}</p>'),admin=True)
            return self.redirect(f"/admin/content/{collection}/{stable_id}")
        return self.respond(404,b"Not found")
    def static(self,route):
        relative=route.lstrip("/") or "index.html"; first=relative.split("/",1)[0]
        if relative not in PUBLIC_TOP_LEVEL and first not in PUBLIC_DIRS:return self.not_found()
        data_collections={"data/site-config.js":"SITE_CONFIG","data/announcements.js":"ANNOUNCEMENTS","data/gallery.js":"GALLERY_ITEMS","data/navigation.js":"NAVIGATION","data/content.js":"SITE_CONTENT"}
        if relative in data_collections:
            collection=data_collections[relative]; body=(f"window.{collection} = "+json.dumps(browser_value(self.app.db,collection),ensure_ascii=False,separators=(",",":"))+";\n").encode()
            return self.respond(200,body,"application/javascript; charset=utf-8",[("Cache-Control","no-cache")])
        path=(self.app.config.root/relative).resolve()
        if self.app.config.root not in path.parents or not path.is_file():return self.not_found()
        mime=mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        return self.respond(200,path.read_bytes(),mime+("; charset=utf-8" if mime.startswith("text/") or mime in {"application/javascript","application/json"} else ""),[("Cache-Control","public,max-age=300")])
    def not_found(self):
        body=(self.app.config.root/"404.html").read_bytes(); return self.respond(404,body)


class Application:
    def __init__(self,config):
        self.config=config; self.db=Database(config.database); self.db.initialize(); self.services=Services(self.db,config)
        if os.environ.get("SKIP_IMPORT")!="1": import_static_data(self.db,config.root)


def main():
    configure_logging(); config=Config.from_env(); app=Application(config); address=os.environ.get("BIND","0.0.0.0"); port=int(os.environ.get("PORT","8000")); server=ThreadingHTTPServer((address,port),Handler); server.app=app
    LOG.info(json.dumps({"event":"startup","address":address,"port":port})); server.serve_forever()


if __name__=="__main__":main()
