"""Configuração da aplicação baseada em variáveis de ambiente."""

from __future__ import annotations

import re
import secrets
from functools import lru_cache
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = BACKEND_DIR.parent

# Usado apenas em desenvolvimento local quando DATABASE_URL não é informada.
DEFAULT_LOCAL_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ai_content_manager"
DEV_CORS_ORIGINS = "http://localhost:4200"
DEFAULT_FRONTEND_DIST = REPO_DIR / "frontend" / "dist" / "frontend" / "browser"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # O .env pode ficar na raiz do repositório (Docker Compose) ou em backend/.
        env_file=(REPO_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    environment: Literal["development", "test", "production"] = "development"
    database_url: str = ""
    # Opcional: schema exclusivo do app (útil quando o banco é compartilhado com outro projeto).
    database_schema: str = ""
    secret_key: str = ""
    access_token_expire_minutes: int = Field(60, ge=5, le=60 * 24 * 7)
    cors_origins: str = ""

    ai_api_key: str = ""
    ai_api_url: str = ""
    ai_model: str = ""
    ai_timeout_seconds: float = Field(30.0, gt=0, le=120)
    ai_daily_generation_limit: int = Field(20, ge=1, le=10_000)

    usage_timezone: str = "America/Sao_Paulo"
    frontend_dist_dir: str = ""

    @field_validator("database_schema")
    @classmethod
    def _validate_schema(cls, value: str) -> str:
        # Vira identificador SQL (CREATE SCHEMA / search_path): aceita só nomes simples e seguros.
        if value and not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", value):
            raise ValueError("DATABASE_SCHEMA deve usar apenas letras minúsculas, números e _ (ex.: ai_content_manager).")
        return value

    @field_validator("usage_timezone")
    @classmethod
    def _validate_timezone(cls, value: str) -> str:
        ZoneInfo(value)  # levanta ZoneInfoNotFoundError se for inválido
        return value

    @model_validator(mode="after")
    def _validate_environment(self) -> "Settings":
        if self.environment == "production":
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY é obrigatória em produção e deve ter ao menos 32 caracteres.")
            if not self.database_url:
                raise ValueError("DATABASE_URL é obrigatória em produção.")
            if "*" in self.cors_origins_list:
                raise ValueError("CORS_ORIGINS não pode conter '*' em produção.")
        else:
            if not self.secret_key:
                # Chave efêmera: tokens deixam de valer a cada reinício (apenas dev/test).
                self.secret_key = secrets.token_urlsafe(48)
            if not self.cors_origins:
                self.cors_origins = DEV_CORS_ORIGINS  # ng serve local
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        """Converte a URL do provedor (postgres://, postgresql://) para o driver psycopg 3."""
        url = self.database_url or DEFAULT_LOCAL_DATABASE_URL
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    @property
    def ai_configured(self) -> bool:
        return bool(self.ai_api_key and self.ai_api_url and self.ai_model)

    @property
    def frontend_dist_path(self) -> Path:
        return Path(self.frontend_dist_dir) if self.frontend_dist_dir else DEFAULT_FRONTEND_DIST


@lru_cache
def get_settings() -> Settings:
    return Settings()
