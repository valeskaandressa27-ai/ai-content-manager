import pytest

from tests.helpers import PASSWORD, content_payload, register


def field_errors(response) -> dict[str, str]:
    return {item["field"]: item["message"] for item in response.json()["errors"]}


def test_register_requires_all_fields(client):
    response = client.post("/api/auth/register", json={})
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert set(field_errors(response)) == {"name", "email", "password", "password_confirm"}


@pytest.mark.parametrize("email", ["sem-arroba", "a@", "@dominio.com", "espaço @x.com"])
def test_register_rejects_invalid_email(client, email):
    response = register(client, email)
    assert response.status_code == 422
    assert field_errors(response)["email"] == "E-mail inválido."


@pytest.mark.parametrize(
    "password",
    ["curta1", "somenteletras", "12345678", "a" * 80 + "1"],
)
def test_register_rejects_weak_passwords(client, password):
    response = register(client, "ana@example.com", password=password)
    assert response.status_code == 422
    assert "password" in field_errors(response)


def test_register_rejects_password_mismatch(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Ana", "email": "ana@example.com", "password": PASSWORD, "password_confirm": "Outra1234"},
    )
    assert response.status_code == 422
    assert "confirmação" in response.json()["errors"][0]["message"]


def test_register_rejects_blank_or_short_name(client):
    assert register(client, "ana@example.com", name="   ").status_code == 422
    assert register(client, "ana@example.com", name="A").status_code == 422


def test_content_requires_title_and_text(client, user_a):
    response = client.post("/api/contents", headers=user_a, json={"type": "email"})
    assert response.status_code == 422
    assert set(field_errors(response)) == {"title", "generated_content"}


def test_content_rejects_invalid_type_and_status(client, user_a):
    assert client.post("/api/contents", headers=user_a, json=content_payload(type="foo")).status_code == 422
    assert client.post("/api/contents", headers=user_a, json=content_payload(status="foo")).status_code == 422


def test_content_rejects_wrong_formats_and_oversized_data(client, user_a):
    assert client.post("/api/contents", headers=user_a, json=content_payload(title=123)).status_code == 422
    assert client.post("/api/contents", headers=user_a, json=content_payload(title="x" * 201)).status_code == 422
    huge = {"k": "x" * 11_000}
    assert client.post("/api/contents", headers=user_a, json=content_payload(input_data=huge)).status_code == 422


def test_malformed_json_returns_422(client, user_a):
    response = client.post(
        "/api/contents", headers={**user_a, "Content-Type": "application/json"}, content="{nao-e-json"
    )
    assert response.status_code == 422


def test_non_numeric_id_returns_422(client, user_a):
    assert client.get("/api/contents/abc", headers=user_a).status_code == 422


def test_unknown_api_route_returns_json_404(client):
    response = client.get("/api/nao-existe")
    assert response.status_code == 404
    assert response.json()["code"] == "HTTP_ERROR"


def test_method_not_allowed_returns_405(client, user_a):
    assert client.put("/api/contents", headers=user_a, json={}).status_code == 405


def test_unexpected_errors_return_generic_500_without_details(client, user_a):
    def boom(*args, **kwargs):
        raise RuntimeError("segredo interno: postgres://user:senha@host/db")

    client.app.state.session_factory = boom  # força uma exceção inesperada
    response = client.get("/api/contents", headers=user_a)
    assert response.status_code == 500
    assert response.json()["code"] == "INTERNAL_ERROR"
    assert "senha" not in response.text and "RuntimeError" not in response.text
