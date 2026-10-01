"""Criação do engine/sessões e dependência de banco por requisição."""

from __future__ import annotations

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings


def create_db_engine(settings: Settings) -> Engine:
    url = settings.sqlalchemy_database_url
    if url.startswith("sqlite"):
        # SQLite é usado somente nos testes automatizados (em memória).
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    connect_args = {}
    if settings.database_schema:
        # Todas as conexões do app (e do Alembic) enxergam apenas o schema exclusivo.
        connect_args["options"] = f"-csearch_path={settings.database_schema}"
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db(request: Request) -> Iterator[Session]:
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()
