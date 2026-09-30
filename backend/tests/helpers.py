from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

PASSWORD = "Senha1234"


class FakeProvider:
    """Provedor de IA falso e determinístico para os testes."""

    def __init__(self) -> None:
        self.calls: list[dict[str, str]] = []
        self.error: Exception | None = None
        self.text = "Texto gerado pela IA de teste."

    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        self.calls.append({"system": system_prompt, "user": user_prompt})
        if self.error is not None:
            raise self.error
        return self.text


def register(client: TestClient, email: str, name: str = "Usuária Teste", password: str = PASSWORD):
    return client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password, "password_confirm": password},
    )


def auth_headers(client: TestClient, email: str, name: str = "Usuária Teste") -> dict[str, str]:
    assert register(client, email, name).status_code == 201
    response = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def content_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": "instagram_caption",
        "title": "Legenda de lançamento",
        "generated_content": "Conheça nosso novo produto!",
        "input_data": {"product_or_service": "Esmalte vegano"},
        "status": "saved",
    }
    payload.update(overrides)
    return payload


def campaign_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Dia das Mães",
        "product_or_service": "Kit de skincare",
        "objective": "Aumentar vendas",
        "target_audience": "Mulheres 25-45",
        "period": "1 semana",
        "tone": "Carinhoso",
        "additional_info": None,
        "generated_content": "CONCEITO DA CAMPANHA\nAmor em cada detalhe.",
    }
    payload.update(overrides)
    return payload


def generate_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "content_type": "instagram_caption",
        "product_or_service": "Esmalte vegano",
        "target_audience": "Mulheres 20-40",
        "objective": "Divulgar lançamento",
        "tone": "Descontraído",
        "length": "medium",
        "additional_info": "Cores outono",
        "use_company_context": True,
    }
    payload.update(overrides)
    return payload


def campaign_generate_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Semana do Cliente",
        "product_or_service": "Corte e escova",
        "objective": "Fidelizar",
        "target_audience": "Clientes atuais",
        "period": "7 dias",
        "tone": "Amigável",
        "additional_info": None,
        "use_company_context": True,
    }
    payload.update(overrides)
    return payload
