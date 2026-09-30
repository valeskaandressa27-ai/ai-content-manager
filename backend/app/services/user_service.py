from __future__ import annotations

from app.core.errors import AppError
from app.core.security import hash_password, verify_password
from app.models import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import PasswordChange, UserUpdate


class UserService:
    def __init__(self, users: UserRepository) -> None:
        self.users = users

    def update_profile(self, user: User, payload: UserUpdate) -> User:
        user.name = payload.name
        return self.users.save(user)

    def change_password(self, user: User, payload: PasswordChange) -> None:
        if not verify_password(payload.current_password, user.password_hash):
            # 400 (e não 401) para o frontend não confundir com sessão expirada.
            raise AppError("Senha atual incorreta.", code="INVALID_CURRENT_PASSWORD")
        user.password_hash = hash_password(payload.new_password)
        self.users.save(user)
