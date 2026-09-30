from tests.helpers import content_payload


def create(client, headers, **overrides):
    response = client.post("/api/contents", headers=headers, json=content_payload(**overrides))
    assert response.status_code == 201, response.text
    return response.json()


def test_create_content(client, user_a):
    body = create(client, user_a)
    assert body["id"] > 0
    assert body["type"] == "instagram_caption"
    assert body["status"] == "saved"
    assert body["input_data"] == {"product_or_service": "Esmalte vegano"}


def test_create_content_defaults_to_saved_and_accepts_draft(client, user_a):
    payload = content_payload()
    del payload["status"]
    assert client.post("/api/contents", headers=user_a, json=payload).json()["status"] == "saved"
    assert create(client, user_a, status="draft")["status"] == "draft"


def test_get_content_by_id(client, user_a):
    created = create(client, user_a)
    response = client.get(f"/api/contents/{created['id']}", headers=user_a)
    assert response.status_code == 200
    assert response.json()["title"] == "Legenda de lançamento"


def test_get_missing_content_returns_404(client, user_a):
    response = client.get("/api/contents/9999", headers=user_a)
    assert response.status_code == 404
    assert response.json()["detail"] == "Conteúdo não encontrado."


def test_update_content(client, user_a):
    created = create(client, user_a)
    response = client.patch(
        f"/api/contents/{created['id']}",
        headers=user_a,
        json={"title": "Novo título", "generated_content": "Texto editado", "status": "draft"},
    )
    assert response.status_code == 200
    body = response.json()
    assert (body["title"], body["generated_content"], body["status"]) == ("Novo título", "Texto editado", "draft")
    assert client.get(f"/api/contents/{created['id']}", headers=user_a).json()["title"] == "Novo título"


def test_partial_update_keeps_other_fields(client, user_a):
    created = create(client, user_a)
    body = client.patch(f"/api/contents/{created['id']}", headers=user_a, json={"status": "draft"}).json()
    assert body["title"] == created["title"]
    assert body["generated_content"] == created["generated_content"]


def test_delete_content(client, user_a):
    created = create(client, user_a)
    assert client.delete(f"/api/contents/{created['id']}", headers=user_a).status_code == 204
    assert client.get(f"/api/contents/{created['id']}", headers=user_a).status_code == 404
    assert client.delete(f"/api/contents/{created['id']}", headers=user_a).status_code == 404


def test_list_orders_newest_first(client, user_a):
    for title in ("Primeiro", "Segundo", "Terceiro"):
        create(client, user_a, title=title)
    titles = [item["title"] for item in client.get("/api/contents", headers=user_a).json()["items"]]
    assert titles == ["Terceiro", "Segundo", "Primeiro"]


def test_list_empty(client, user_a):
    body = client.get("/api/contents", headers=user_a).json()
    assert body == {"items": [], "total": 0, "page": 1, "page_size": 10, "pages": 1}


def test_pagination(client, user_a):
    for index in range(5):
        create(client, user_a, title=f"Conteúdo {index}")
    page1 = client.get("/api/contents?page=1&page_size=2", headers=user_a).json()
    page3 = client.get("/api/contents?page=3&page_size=2", headers=user_a).json()
    assert (page1["total"], page1["pages"], len(page1["items"])) == (5, 3, 2)
    assert [i["title"] for i in page1["items"]] == ["Conteúdo 4", "Conteúdo 3"]
    assert [i["title"] for i in page3["items"]] == ["Conteúdo 0"]


def test_page_size_is_capped(client, user_a):
    assert client.get("/api/contents?page_size=1000", headers=user_a).status_code == 422
    assert client.get("/api/contents?page=0", headers=user_a).status_code == 422


def test_filter_by_type_and_status(client, user_a):
    create(client, user_a, type="email", title="E-mail", status="saved")
    create(client, user_a, type="email", title="E-mail rascunho", status="draft")
    create(client, user_a, type="ad", title="Anúncio", status="saved")
    by_type = client.get("/api/contents?type=email", headers=user_a).json()
    by_status = client.get("/api/contents?status=draft", headers=user_a).json()
    both = client.get("/api/contents?type=email&status=saved", headers=user_a).json()
    assert by_type["total"] == 2
    assert [i["title"] for i in by_status["items"]] == ["E-mail rascunho"]
    assert [i["title"] for i in both["items"]] == ["E-mail"]


def test_search_matches_title_and_text_case_insensitive(client, user_a):
    create(client, user_a, title="Promoção de Verão", generated_content="Descontos incríveis")
    create(client, user_a, title="Outro", generated_content="Novidade na loja")
    assert client.get("/api/contents?search=promoção", headers=user_a).json()["total"] == 1
    assert client.get("/api/contents?search=NOVIDADE", headers=user_a).json()["total"] == 1
    assert client.get("/api/contents?search=inexistente", headers=user_a).json()["total"] == 0


def test_search_treats_like_wildcards_as_literal_text(client, user_a):
    create(client, user_a, title="Desconto de 50%")
    create(client, user_a, title="Sem desconto")
    assert client.get("/api/contents?search=%25", headers=user_a).json()["total"] == 1
    assert client.get("/api/contents?search=_", headers=user_a).json()["total"] == 0


def test_invalid_filter_values_return_422(client, user_a):
    assert client.get("/api/contents?type=nao_existe", headers=user_a).status_code == 422
    assert client.get("/api/contents?status=nao_existe", headers=user_a).status_code == 422


def test_saving_content_links_generation(client, user_a, fake_ai):
    from tests.helpers import generate_payload

    generation = client.post("/api/ai/generate", headers=user_a, json=generate_payload()).json()
    content = create(client, user_a, generation_id=generation["generation_id"])
    recent = client.get("/api/dashboard", headers=user_a).json()["recent_generations"]
    assert recent[0]["id"] == generation["generation_id"]
    assert recent[0]["content_id"] == content["id"]
