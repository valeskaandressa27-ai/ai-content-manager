"""Health check, servidor da SPA Angular, CORS e configuração por ambiente."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from tests.conftest import make_settings


# ---------- health ----------


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_swagger_and_openapi_are_available(client):
    assert client.get("/api/docs").status_code == 200
    schema = client.get("/api/openapi.json").json()
    tags = {tag["name"] for tag in schema["tags"]}
    assert {"Authentication", "Users", "Company", "Contents", "Campaigns", "AI", "Dashboard"} <= tags


# ---------- SPA ----------


@pytest.fixture
def spa_client(client_factory, tmp_path):
    (tmp_path / "index.html").write_text("<html>angular-app</html>")
    (tmp_path / "main-ABCD1234.js").write_text("console.log('app')")
    (tmp_path / "favicon.ico").write_bytes(b"ico")
    outside = tmp_path.parent / "segredo.txt"
    outside.write_text("conteudo-secreto")
    return client_factory(frontend_dist_dir=str(tmp_path))


@pytest.mark.parametrize("path", ["/", "/login", "/register", "/dashboard", "/contents/42", "/campaigns/7", "/company"])
def test_spa_routes_fall_back_to_index(spa_client, path):
    response = spa_client.get(path)
    assert response.status_code == 200
    assert "angular-app" in response.text
    assert response.headers["cache-control"] == "no-cache"


def test_spa_serves_static_files_with_long_cache_for_hashed_assets(spa_client):
    hashed = spa_client.get("/main-ABCD1234.js")
    assert hashed.status_code == 200 and "console.log" in hashed.text
    assert "immutable" in hashed.headers["cache-control"]
    assert spa_client.get("/favicon.ico").content == b"ico"


def test_spa_missing_asset_is_404_not_index(spa_client):
    assert spa_client.get("/missing.js").status_code == 404


def test_spa_does_not_shadow_api_or_health(spa_client):
    assert spa_client.get("/health").json() == {"status": "ok"}
    response = spa_client.get("/api/rota-inexistente")
    assert response.status_code == 404 and response.json()["code"] == "NOT_FOUND"
    assert spa_client.get("/api/docs").status_code == 200
    assert spa_client.get("/api/auth/me").status_code == 401


def test_spa_blocks_path_traversal(spa_client):
    for path in ("/..%2fsegredo.txt", "/%2e%2e/segredo.txt", "/../segredo.txt"):
        response = spa_client.get(path)
        assert "conteudo-secreto" not in response.text


def test_without_frontend_build_only_api_is_served(client):
    assert client.get("/login").status_code == 404
    assert client.get("/health").status_code == 200


# ---------- CORS ----------


def test_cors_allows_configured_origin_only(client_factory):
    client = client_factory(cors_origins="https://app.example.com, http://localhost:4200")
    allowed = client.options(
        "/api/auth/login",
        headers={"Origin": "https://app.example.com", "Access-Control-Request-Method": "POST"},
    )
    assert allowed.headers["access-control-allow-origin"] == "https://app.example.com"
    denied = client.options(
        "/api/auth/login",
        headers={"Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in denied.headers


# ---------- configuração ----------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("postgres://u:p@host:5432/db", "postgresql+psycopg://u:p@host:5432/db"),
        ("postgresql://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("postgresql+psycopg://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("sqlite://", "sqlite://"),
    ],
)
def test_database_url_is_adapted_for_sqlalchemy(raw, expected):
    assert make_settings(database_url=raw).sqlalchemy_database_url == expected


def production(**overrides) -> Settings:
    values = {
        "environment": "production",
        "secret_key": "s" * 40,
        "database_url": "postgres://u:p@host/db",
        "cors_origins": "https://app.example.com",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_production_settings_ok():
    settings = production()
    assert settings.is_production
    assert settings.cors_origins_list == ["https://app.example.com"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"secret_key": ""},
        {"secret_key": "curta"},
        {"database_url": ""},
        {"cors_origins": "*"},
        {"cors_origins": "https://a.com,*"},
    ],
)
def test_production_rejects_insecure_settings(overrides):
    with pytest.raises(ValidationError):
        production(**overrides)


def test_cors_defaults_to_angular_dev_server_only_outside_production():
    assert Settings(_env_file=None, environment="development").cors_origins_list == ["http://localhost:4200"]
    assert production(cors_origins="").cors_origins_list == []  # produção: mesma origem, sem CORS


def test_development_generates_ephemeral_secret_when_missing():
    settings = Settings(_env_file=None, environment="development", secret_key="")
    assert len(settings.secret_key) >= 32


@pytest.mark.parametrize("schema", ["ai_content_manager", "app1", "_x"])
def test_database_schema_accepts_simple_names(schema):
    assert make_settings(database_schema=schema).database_schema == schema


@pytest.mark.parametrize("schema", ["Public", "a-b", 'x"; DROP TABLE users; --', "a b", "1abc", "x" * 64])
def test_database_schema_rejects_unsafe_names(schema):
    with pytest.raises(ValidationError):
        make_settings(database_schema=schema)


def test_database_schema_is_optional():
    assert make_settings().database_schema == ""


def test_invalid_timezone_and_limit_are_rejected():
    with pytest.raises(Exception):
        make_settings(usage_timezone="Marte/Olimpo")
    with pytest.raises(ValidationError):
        make_settings(ai_daily_generation_limit=0)
