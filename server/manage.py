"""Non-interactive owner-controlled account setup commands."""
import argparse
import getpass
import os

from .app import Application
from .config import Config
from .security import generate_totp_secret, provisioning_uri
from .services import Principal


def main():
    parser=argparse.ArgumentParser(); sub=parser.add_subparsers(dest="command",required=True)
    owner=sub.add_parser("bootstrap-owner"); owner.add_argument("--name",required=True); owner.add_argument("--email",required=True)
    assign=sub.add_parser("assign-officer"); assign.add_argument("position",choices=("it_head","it_assistant")); assign.add_argument("--name",required=True); assign.add_argument("--email",required=True)
    enroll=sub.add_parser("new-totp"); enroll.add_argument("--email",required=True)
    activate=sub.add_parser("activate"); activate.add_argument("--token",required=True); activate.add_argument("--secret",required=True); activate.add_argument("--code",required=True)
    args=parser.parse_args(); app=Application(Config.from_env())
    if args.command=="bootstrap-owner":
        secret=generate_totp_secret(); password=os.environ.get("BOOTSTRAP_PASSWORD") or getpass.getpass("Owner password: "); app.services.bootstrap_owner(args.name,args.email,password,secret); print("Enroll before closing this terminal:",provisioning_uri(secret,args.email))
    elif args.command=="assign-officer":
        with app.db.connect() as db: row=db.execute("SELECT id,display_name FROM accounts WHERE position_id='owner' AND state='active'").fetchone()
        if not row:raise SystemExit("Bootstrap the owner first")
        activation=app.services.assign_officer(Principal(row[0],"owner",row[1],"owner-console","",int(__import__('time').time())),args.position,args.name,args.email); print("Deliver privately; expires in 24 hours:",f"{app.config.public_origin}/admin/activate?token={activation}")
    elif args.command=="new-totp":
        secret=generate_totp_secret(); print(secret); print(provisioning_uri(secret,args.email))
    else:
        password=os.environ.get("ACTIVATION_PASSWORD") or getpass.getpass("New password: "); codes=app.services.activate(args.token,password,args.secret,args.code); print("Store these single-use recovery codes securely; they are shown once:"); print("\n".join(codes))


if __name__=="__main__":main()
