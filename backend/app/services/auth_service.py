from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from app.core.config import Settings
from app.core.errors import ConflictError, UnauthorizedError
from app.core.security import burn_password_check, create_access_token, hash_password, verify_password
from app.models import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import LoginRequest, RegisterRequest, TokenResponse, UserRead


class AuthService:
    def __init__(self, users: UserRepository, settings: Settings) -> None:
        self.users = users
        self.settings = settings

    def register(self, payload: RegisterRequest) -> User:
        if self.users.get_by_email(payload.email):
            raise ConflictError("E-mail já cadastrado.", code="EMAIL_ALREADY_REGISTERED")
        user = User(name=payload.name, email=payload.email, password_hash=hash_password(payload.password))
        try:
            return self.users.add(user)
        except IntegrityError as exc:  # corrida entre dois cadastros com o mesmo e-mail
            self.users.rollback()
            raise ConflictError("E-mail já cadastrado.", code="EMAIL_ALREADY_REGISTERED") from exc

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = self.users.get_by_email(payload.email)
        if user is None:
            burn_password_check(payload.password)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedError("E-mail ou senha inválidos.", code="INVALID_CREDENTIALS")
        token, expires_in = create_access_token(user.id, self.settings)
        return TokenResponse(access_token=token, expires_in=expires_in, user=UserRead.model_validate(user))
