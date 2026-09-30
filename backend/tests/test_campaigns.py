from tests.helpers import campaign_payload


def create(client, headers, **overrides):
    response = client.post("/api/campaigns", headers=headers, json=campaign_payload(**overrides))
    assert response.status_code == 201, response.text
    return response.json()


def test_create_campaign(client, user_a):
    body = create(client, user_a)
    assert body["name"] == "Dia das Mães"
    assert body["period"] == "1 semana"
    assert body["additional_info"] is None
    assert body["generated_content"].startswith("CONCEITO")


def test_get_campaign(client, user_a):
    created = create(client, user_a)
    assert client.get(f"/api/campaigns/{created['id']}", headers=user_a).json()["id"] == created["id"]
    assert client.get("/api/campaigns/9999", headers=user_a).json()["detail"] == "Campanha não encontrada."


def test_list_campaigns_with_pagination_and_search(client, user_a):
    for name in ("Natal", "Black Friday", "Dia das Crianças"):
        create(client, user_a, name=name)
    listing = client.get("/api/campaigns?page_size=2", headers=user_a).json()
    assert (listing["total"], listing["pages"], len(listing["items"])) == (3, 2, 2)
    assert listing["items"][0]["name"] == "Dia das Crianças"
    found = client.get("/api/campaigns?search=friday", headers=user_a).json()
    assert [item["name"] for item in found["items"]] == ["Black Friday"]


def test_update_campaign(client, user_a):
    created = create(client, user_a)
    response = client.patch(
        f"/api/campaigns/{created['id']}",
        headers=user_a,
        json={"name": "Campanha Nova", "generated_content": "Novo plano", "objective": None},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Campanha Nova"
    assert body["generated_content"] == "Novo plano"
    assert body["objective"] is None  # campo opcional pode ser limpo
    assert body["product_or_service"] == "Kit de skincare"


def test_update_cannot_null_required_fields(client, user_a):
    created = create(client, user_a)
    body = client.patch(f"/api/campaigns/{created['id']}", headers=user_a, json={"name": None}).json()
    assert body["name"] == "Dia das Mães"


def test_delete_campaign(client, user_a):
    created = create(client, user_a)
    assert client.delete(f"/api/campaigns/{created['id']}", headers=user_a).status_code == 204
    assert client.get(f"/api/campaigns/{created['id']}", headers=user_a).status_code == 404
