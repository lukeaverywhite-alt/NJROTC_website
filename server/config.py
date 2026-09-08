"""Environment-only production configuration."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _required(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


@dataclass(frozen=True)
class Config:
    root: Path
    database: Path
    media_dir: Path
    session_key: bytes
    totp_key: bytes
    owner_email: str
    public_origin: str
    trusted_proxies: tuple[str, ...]
    secure_cookies: bool
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    smtp_sender: str
    max_upload_bytes: int = 10 * 1024 * 1024
    session_seconds: int = 8 * 60 * 60
    device_seconds: int = 90 * 24 * 60 * 60
    reauth_seconds: int = 10 * 60

    @classmethod
    def from_env(cls, *, testing: bool = False) -> "Config":
        root = Path(os.environ.get("APP_ROOT", Path(__file__).resolve().parents[1])).resolve()
        state = Path(os.environ.get("STATE_DIR", root / ".state")).resolve()
        state.mkdir(parents=True, exist_ok=True)
        media = Path(os.environ.get("MEDIA_DIR", state / "media")).resolve()
        media.mkdir(parents=True, exist_ok=True)
        dev_key = "test-only-key-not-for-deployment" if testing else None
        return cls(
            root=root, database=Path(os.environ.get("DATABASE_PATH", state / "site.sqlite3")),
            media_dir=media,
            session_key=_required("SESSION_KEY", dev_key).encode(),
            totp_key=_required("TOTP_ENCRYPTION_KEY", dev_key).encode(),
            owner_email=_required("OWNER_EMAIL", "owner@example.invalid" if testing else None),
            public_origin=_required("PUBLIC_ORIGIN", "http://localhost:8000" if testing else None).rstrip("/"),
            trusted_proxies=tuple(x.strip() for x in os.environ.get("TRUSTED_PROXIES", "127.0.0.1,::1").split(",") if x.strip()),
            secure_cookies=os.environ.get("SECURE_COOKIES", "0" if testing else "1") == "1",
            smtp_host=os.environ.get("SMTP_HOST", ""), smtp_port=int(os.environ.get("SMTP_PORT", "587")),
            smtp_user=os.environ.get("SMTP_USER", ""), smtp_password=os.environ.get("SMTP_PASSWORD", ""),
            smtp_sender=os.environ.get("SMTP_SENDER", ""),
            max_upload_bytes=int(os.environ.get("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))),
        )
