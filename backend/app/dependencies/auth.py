from __future__ import annotations

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import UnauthorizedError
from app.core.security import decode_access_token
from app.database.session import get_db
from app.dependencies.settings import get_app_settings
from app.models import User
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False, description="Token JWT obtido em POST /api/auth/login.")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
) -> User:
    """Identifica o usuário exclusivamente pelo JWT (nunca por ids enviados pelo cliente)."""
    if credentials is None:
        raise UnauthorizedError("Autenticação necessária.", code="NOT_AUTHENTICATED")
    try:
        user_id = decode_access_token(credentials.credentials, settings)
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Sua sessão expirou. Faça login novamente.", code="TOKEN_EXPIRED") from exc
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Sessão inválida. Faça login novamente.", code="TOKEN_INVALID") from exc

    user = UserRepository(db).get(user_id)
    if user is None:
        raise UnauthorizedError("Sessão inválida. Faça login novamente.", code="TOKEN_INVALID")
    return user
