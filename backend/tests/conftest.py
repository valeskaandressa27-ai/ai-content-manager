import os

# Precisa vir antes de importar app.main (que cria a instância global da aplicação).
# Por padrão os testes usam SQLite em memória. Para rodar contra PostgreSQL:
#   TEST_DATABASE_URL=postgresql://user:pass@host/db_de_teste pytest   (as tabelas são recriadas!)
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.database.base import Base
from app.dependencies.services import get_ai_provider
from app.main import create_app
from tests.helpers import FakeProvider, auth_headers


def make_settings(**overrides) -> Settings:
    values = {
        "environment": "test",
        "database_url": TEST_DATABASE_URL,
        "secret_key": "test-secret-key-with-more-than-thirty-two-chars",
        "cors_origins": "http://localhost:4200",
        "ai_api_key": "test-key",
        "ai_api_url": "https://ai.example.test/v1/chat/completions",
        "ai_model": "test-model",
        "ai_daily_generation_limit": 20,
        "frontend_dist_dir": "/nonexistent-dist",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


@pytest.fixture
def client_factory():
    """Cria clientes isolados (cada um com seu banco SQLite em memória)."""
    created: list[TestClient] = []

    def factory(*, fake_provider: bool = True, **overrides) -> TestClient:
        app = create_app(make_settings(**overrides))
        Base.metadata.drop_all(app.state.engine)  # começa sempre do zero
        Base.metadata.create_all(app.state.engine)
        if fake_provider:
            app.dependency_overrides[get_ai_provider] = lambda: app.state.fake_provider
            app.state.fake_provider = FakeProvider()
        client = TestClient(app, raise_server_exceptions=False)
        client.__enter__()
        created.append(client)
        return client

    yield factory
    for client in created:
        engine = client.app.state.engine
        client.__exit__(None, None, None)
        if not TEST_DATABASE_URL.startswith("sqlite"):
            Base.metadata.drop_all(engine)


@pytest.fixture
def client(client_factory) -> TestClient:
    return client_factory()


@pytest.fixture
def fake_ai(client) -> FakeProvider:
    return client.app.state.fake_provider


@pytest.fixture
def user_a(client) -> dict[str, str]:
    return auth_headers(client, "ana@example.com", "Ana")


@pytest.fixture
def user_b(client) -> dict[str, str]:
    return auth_headers(client, "bruno@example.com", "Bruno")
