"""Isolamento de dados: um usuário jamais acessa, edita ou exclui dados de outro."""

import pytest

from tests.helpers import campaign_payload, content_payload, generate_payload


@pytest.fixture
def content_of_a(client, user_a) -> int:
    response = client.post("/api/contents", headers=user_a, json=content_payload())
    assert response.status_code == 201
    return response.json()["id"]


@pytest.fixture
def campaign_of_a(client, user_a) -> int:
    response = client.post("/api/campaigns", headers=user_a, json=campaign_payload())
    assert response.status_code == 201
    return response.json()["id"]


def test_owner_can_access_own_content(client, user_a, content_of_a):
    assert client.get(f"/api/contents/{content_of_a}", headers=user_a).status_code == 200


def test_user_cannot_read_content_of_another_user(client, user_b, content_of_a):
    response = client.get(f"/api/contents/{content_of_a}", headers=user_b)
    assert response.status_code == 404
    assert response.json()["detail"] == "Conteúdo não encontrado."


def test_user_cannot_edit_content_of_another_user(client, user_a, user_b, content_of_a):
    response = client.patch(f"/api/contents/{content_of_a}", headers=user_b, json={"title": "Invadido"})
    assert response.status_code == 404
    assert client.get(f"/api/contents/{content_of_a}", headers=user_a).json()["title"] == "Legenda de lançamento"


def test_user_cannot_delete_content_of_another_user(client, user_a, user_b, content_of_a):
    assert client.delete(f"/api/contents/{content_of_a}", headers=user_b).status_code == 404
    assert client.get(f"/api/contents/{content_of_a}", headers=user_a).status_code == 200


def test_content_list_only_contains_own_items(client, user_a, user_b, content_of_a):
    client.post("/api/contents", headers=user_b, json=content_payload(title="Conteúdo do Bruno"))
    titles_a = [item["title"] for item in client.get("/api/contents", headers=user_a).json()["items"]]
    titles_b = [item["title"] for item in client.get("/api/contents", headers=user_b).json()["items"]]
    assert titles_a == ["Legenda de lançamento"]
    assert titles_b == ["Conteúdo do Bruno"]


def test_user_cannot_access_campaign_of_another_user(client, user_a, user_b, campaign_of_a):
    assert client.get(f"/api/campaigns/{campaign_of_a}", headers=user_b).status_code == 404
    assert client.patch(f"/api/campaigns/{campaign_of_a}", headers=user_b, json={"name": "X X"}).status_code == 404
    assert client.delete(f"/api/campaigns/{campaign_of_a}", headers=user_b).status_code == 404
    assert client.get(f"/api/campaigns/{campaign_of_a}", headers=user_a).json()["name"] == "Dia das Mães"
    assert client.get("/api/campaigns", headers=user_b).json()["total"] == 0


def test_company_is_private_per_user(client, user_a, user_b):
    client.put("/api/company", headers=user_a, json={"name": "Studio da Ana"})
    assert client.get("/api/company", headers=user_b).json() is None
    client.put("/api/company", headers=user_b, json={"name": "Barbearia do Bruno"})
    assert client.get("/api/company", headers=user_a).json()["name"] == "Studio da Ana"
    assert client.get("/api/company", headers=user_b).json()["name"] == "Barbearia do Bruno"


def test_profile_update_only_affects_authenticated_user(client, user_a, user_b):
    client.patch("/api/users/me", headers=user_a, json={"name": "Ana Editada"})
    assert client.get("/api/users/me", headers=user_a).json()["name"] == "Ana Editada"
    assert client.get("/api/users/me", headers=user_b).json()["name"] == "Bruno"


def test_cannot_link_content_to_generation_of_another_user(client, user_a, user_b, fake_ai):
    generation_id = client.post("/api/ai/generate", headers=user_a, json=generate_payload()).json()["generation_id"]
    response = client.post("/api/contents", headers=user_b, json=content_payload(generation_id=generation_id))
    assert response.status_code == 404


def test_ai_usage_and_dashboard_are_isolated(client, user_a, user_b, fake_ai):
    client.post("/api/ai/generate", headers=user_a, json=generate_payload())
    assert client.get("/api/ai/usage", headers=user_a).json()["used_today"] == 1
    assert client.get("/api/ai/usage", headers=user_b).json()["used_today"] == 0
    assert client.get("/api/dashboard", headers=user_b).json()["totals"]["generations"] == 0


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/contents"),
        ("get", "/api/contents/1"),
        ("delete", "/api/contents/1"),
        ("get", "/api/campaigns"),
        ("get", "/api/company"),
        ("get", "/api/users/me"),
        ("get", "/api/dashboard"),
        ("get", "/api/ai/usage"),
        ("post", "/api/ai/generate"),
    ],
)
def test_private_endpoints_require_authentication(client, method, path):
    assert getattr(client, method)(path).status_code == 401
