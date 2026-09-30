"""Hash de senhas (bcrypt) e tokens JWT."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import Settings

ALGORITHM = "HS256"
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password", bcrypt.gensalt()).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def burn_password_check(password: str) -> None:
    """Gasta o mesmo tempo de uma verificação real (evita enumeração de e-mails por tempo)."""
    verify_password(password, _DUMMY_HASH)


def create_access_token(user_id: int, settings: Settings) -> tuple[str, int]:
    """Retorna (token, expires_in_segundos)."""
    expires_in = settings.access_token_expire_minutes * 60
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(seconds=expires_in)}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM), expires_in


def decode_access_token(token: str, settings: Settings) -> int:
    """Valida o token e devolve o id do usuário. Levanta jwt.PyJWTError se inválido."""
    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[ALGORITHM],
        options={"require": ["sub", "exp"]},
    )
    try:
        return int(payload["sub"])
    except (TypeError, ValueError) as exc:
        raise jwt.InvalidTokenError("sub inválido") from exc
