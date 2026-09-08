"""Password, TOTP, recovery-code, token, and request security primitives."""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import struct
import time
from urllib.parse import quote


def token(n: int = 32) -> str:
    return base64.urlsafe_b64encode(os.urandom(n)).decode().rstrip("=")


def digest(value: str, key: bytes = b"") -> str:
    return hmac.new(key, value.encode(), hashlib.sha256).hexdigest()


def hash_password(password: str, *, salt: bytes | None = None) -> str:
    if len(password) < 12:
        raise ValueError("Password must contain at least 12 characters")
    salt = salt or os.urandom(16)
    derived = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return "scrypt$16384$8$1$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(derived).decode()


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, salt, expected = encoded.split("$")
        if algorithm != "scrypt": return False
        actual = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt), n=int(n), r=int(r), p=int(p), dklen=32)
        return hmac.compare_digest(actual, base64.b64decode(expected))
    except (ValueError, TypeError):
        return False


def generate_totp_secret() -> str:
    return base64.b32encode(os.urandom(20)).decode().rstrip("=")


def totp(secret: str, at: int | None = None) -> str:
    padding = "=" * ((8 - len(secret) % 8) % 8)
    key = base64.b32decode(secret.upper() + padding)
    counter = int((at or time.time()) // 30)
    mac = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = mac[-1] & 15
    number = (struct.unpack(">I", mac[offset:offset + 4])[0] & 0x7fffffff) % 1_000_000
    return f"{number:06d}"


def verify_totp(secret: str, code: str, at: int | None = None) -> bool:
    now = int(at or time.time())
    return code.isdigit() and any(hmac.compare_digest(totp(secret, now + drift * 30), code) for drift in (-1, 0, 1))


def seal(plaintext: str, key: bytes) -> str:
    """Authenticated stream encryption using stdlib primitives and a deployment key."""
    nonce = os.urandom(16); material = hashlib.sha256(key).digest()
    stream = b""; counter = 0
    while len(stream) < len(plaintext.encode()):
        stream += hmac.new(material, nonce + counter.to_bytes(4, "big"), hashlib.sha256).digest(); counter += 1
    raw = plaintext.encode(); cipher = bytes(a ^ b for a, b in zip(raw, stream))
    tag = hmac.new(material, nonce + cipher, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(nonce + cipher + tag).decode()


def unseal(value: str, key: bytes) -> str:
    packed = base64.urlsafe_b64decode(value); nonce, body = packed[:16], packed[16:]
    cipher, supplied = body[:-32], body[-32:]; material = hashlib.sha256(key).digest()
    expected = hmac.new(material, nonce + cipher, hashlib.sha256).digest()
    if not hmac.compare_digest(supplied, expected): raise ValueError("invalid encrypted value")
    stream = b""; counter = 0
    while len(stream) < len(cipher):
        stream += hmac.new(material, nonce + counter.to_bytes(4, "big"), hashlib.sha256).digest(); counter += 1
    return bytes(a ^ b for a, b in zip(cipher, stream)).decode()


def provisioning_uri(secret: str, email: str) -> str:
    return f"otpauth://totp/{quote('Bethel NJROTC:' + email)}?secret={secret}&issuer={quote('Bethel NJROTC')}&algorithm=SHA1&digits=6&period=30"
