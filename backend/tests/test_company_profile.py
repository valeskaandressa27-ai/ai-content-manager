from tests.helpers import PASSWORD


def test_company_is_null_before_registration(client, user_a):
    response = client.get("/api/company", headers=user_a)
    assert response.status_code == 200
    assert response.json() is None


def test_create_and_update_company(client, user_a):
    created = client.put(
        "/api/company",
        headers=user_a,
        json={"name": "Studio Bela", "segment": "Beleza", "communication_tone": "Acolhedor"},
    )
    assert created.status_code == 200
    assert created.json()["name"] == "Studio Bela"

    updated = client.put("/api/company", headers=user_a, json={"name": "Studio Bela Ltda", "segment": "Estética"})
    assert updated.json()["id"] == created.json()["id"]  # continua sendo uma única empresa
    assert updated.json()["segment"] == "Estética"
    assert updated.json()["communication_tone"] is None  # PUT substitui os campos opcionais
    assert client.get("/api/company", headers=user_a).json()["name"] == "Studio Bela Ltda"


def test_company_requires_name(client, user_a):
    assert client.put("/api/company", headers=user_a, json={"segment": "Beleza"}).status_code == 422
    assert client.put("/api/company", headers=user_a, json={"name": " "}).status_code == 422


def test_get_profile(client, user_a):
    body = client.get("/api/users/me", headers=user_a).json()
    assert body["email"] == "ana@example.com"
    assert body["name"] == "Ana"


def test_update_profile_name_only(client, user_a):
    response = client.patch(
        "/api/users/me", headers=user_a, json={"name": "Ana Souza", "email": "novo@example.com", "id": 99}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Ana Souza"
    assert body["email"] == "ana@example.com"  # e-mail não é alterável por aqui
    assert body["id"] != 99


def test_update_profile_validates_name(client, user_a):
    assert client.patch("/api/users/me", headers=user_a, json={"name": "A"}).status_code == 422


def test_change_password(client, user_a):
    response = client.put(
        "/api/users/me/password",
        headers=user_a,
        json={"current_password": PASSWORD, "new_password": "NovaSenha99", "new_password_confirm": "NovaSenha99"},
    )
    assert response.status_code == 204
    assert client.post("/api/auth/login", json={"email": "ana@example.com", "password": PASSWORD}).status_code == 401
    assert (
        client.post("/api/auth/login", json={"email": "ana@example.com", "password": "NovaSenha99"}).status_code == 200
    )


def test_change_password_requires_correct_current_password(client, user_a):
    response = client.put(
        "/api/users/me/password",
        headers=user_a,
        json={"current_password": "Errada1234", "new_password": "NovaSenha99", "new_password_confirm": "NovaSenha99"},
    )
    assert response.status_code == 400  # não é 401: o usuário continua autenticado
    assert response.json()["code"] == "INVALID_CURRENT_PASSWORD"


def test_change_password_validates_new_password(client, user_a):
    response = client.put(
        "/api/users/me/password",
        headers=user_a,
        json={"current_password": PASSWORD, "new_password": "curta", "new_password_confirm": "curta"},
    )
    assert response.status_code == 422
