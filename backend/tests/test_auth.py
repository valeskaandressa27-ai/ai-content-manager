from datetime import datetime, timedelta, timezone

import jwt

from tests.helpers import PASSWORD, auth_headers, register


def test_register_creates_user_without_exposing_password(client):
    response = register(client, "Ana@Example.com", "Ana Souza")
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ana@example.com"  # normalizado
    assert body["name"] == "Ana Souza"
    assert "password" not in body and "password_hash" not in body


def test_register_duplicate_email_returns_409(client):
    assert register(client, "ana@example.com").status_code == 201
    response = register(client, "ANA@example.com")
    assert response.status_code == 409
    assert response.json()["detail"] == "E-mail já cadastrado."
    assert response.json()["code"] == "EMAIL_ALREADY_REGISTERED"


def test_login_returns_jwt_and_user(client):
    register(client, "ana@example.com", "Ana")
    response = client.post("/api/auth/login", json={"email": "ana@example.com", "password": PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    assert body["user"]["email"] == "ana@example.com"
    assert body["access_token"].count(".") == 2


def test_login_wrong_password_returns_401(client):
    register(client, "ana@example.com")
    response = client.post("/api/auth/login", json={"email": "ana@example.com", "password": "Errada1234"})
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_CREDENTIALS"


def test_login_unknown_email_has_same_error_as_wrong_password(client):
    response = client.post("/api/auth/login", json={"email": "ninguem@example.com", "password": PASSWORD})
    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha inválidos."


def test_me_returns_authenticated_user(client, user_a):
    response = client.get("/api/auth/me", headers=user_a)
    assert response.status_code == 200
    assert response.json()["email"] == "ana@example.com"


def test_protected_route_without_token_returns_401(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["code"] == "NOT_AUTHENTICATED"
    assert response.headers["www-authenticate"] == "Bearer"


def test_protected_route_with_invalid_token_returns_401(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer token.invalido.aqui"})
    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"


def test_token_signed_with_other_secret_is_rejected(client):
    forged = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, "outra-chave", algorithm="HS256"
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 401


def test_expired_token_returns_token_expired(client):
    auth_headers(client, "ana@example.com")
    secret = client.app.state.settings.secret_key
    expired = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}, secret, algorithm="HS256"
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_EXPIRED"


def test_token_for_deleted_user_is_rejected(client):
    secret = client.app.state.settings.secret_key
    token = jwt.encode(
        {"sub": "999", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, secret, algorithm="HS256"
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_identity_comes_only_from_jwt_not_from_client_supplied_user_id(client, user_a, user_b):
    """Um user_id no corpo/query é ignorado: o dono é sempre o usuário do token."""
    response = client.post(
        "/api/contents?user_id=2",
        headers=user_a,
        json={
            "type": "title",
            "title": "Meu título",
            "generated_content": "Texto",
            "user_id": 2,
        },
    )
    assert response.status_code == 201
    assert client.get(f"/api/contents/{response.json()['id']}", headers=user_b).status_code == 404
    assert client.get(f"/api/contents/{response.json()['id']}", headers=user_a).status_code == 200
