from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.core.errors import (
    AIAuthError,
    AIInvalidResponseError,
    AINotConfiguredError,
    AIProviderError,
    AITimeoutError,
)
from app.models import AIGeneration
from app.services.ai.provider import OpenAICompatibleProvider
from tests.helpers import auth_headers, campaign_generate_payload, generate_payload


def generate(client, headers, **overrides):
    return client.post("/api/ai/generate", headers=headers, json=generate_payload(**overrides))


# ---------- geração ----------


def test_generate_returns_text_and_usage(client, user_a, fake_ai):
    response = generate(client, user_a)
    assert response.status_code == 200
    body = response.json()
    assert body["generated_content"] == "Texto gerado pela IA de teste."
    assert body["generation_id"] > 0
    assert body["usage"]["used_today"] == 1
    assert body["usage"]["limit"] == 20
    assert body["usage"]["remaining"] == 19
    assert len(fake_ai.calls) == 1


def test_generate_does_not_persist_content_until_user_saves(client, user_a, fake_ai):
    generate(client, user_a)
    assert client.get("/api/contents", headers=user_a).json()["total"] == 0


def test_prompt_is_built_by_backend_with_company_context(client, user_a, fake_ai):
    client.put(
        "/api/company",
        headers=user_a,
        json={
            "name": "Studio Bela",
            "segment": "Salão de beleza",
            "target_audience": "Mulheres da região",
            "communication_tone": "Acolhedor",
            "brand_information": "Produtos veganos",
        },
    )
    generate(client, user_a)
    prompt = fake_ai.calls[0]["user"]
    assert "Esmalte vegano" in prompt
    assert "Studio Bela" in prompt and "Salão de beleza" in prompt and "Produtos veganos" in prompt
    assert "português do Brasil" in fake_ai.calls[0]["system"]


def test_company_context_can_be_disabled(client, user_a, fake_ai):
    client.put("/api/company", headers=user_a, json={"name": "Studio Bela"})
    generate(client, user_a, use_company_context=False)
    assert "Studio Bela" not in fake_ai.calls[0]["user"]


def test_generate_campaign(client, user_a, fake_ai):
    response = client.post("/api/ai/generate-campaign", headers=user_a, json=campaign_generate_payload())
    assert response.status_code == 200
    assert response.json()["usage"]["used_today"] == 1
    prompt = fake_ai.calls[0]["user"]
    assert "CALENDÁRIO BÁSICO DE PUBLICAÇÃO" in prompt and "Semana do Cliente" in prompt


def test_generate_rejects_invalid_type(client, user_a, fake_ai):
    assert generate(client, user_a, content_type="inexistente").status_code == 422
    assert fake_ai.calls == []


def test_generate_requires_product(client, user_a, fake_ai):
    response = generate(client, user_a, product_or_service="   ")
    assert response.status_code == 422
    assert fake_ai.calls == []


# ---------- regeneração e limite diário ----------


def test_regeneration_consumes_an_additional_generation(client, user_a, fake_ai):
    assert generate(client, user_a).json()["usage"]["used_today"] == 1
    assert generate(client, user_a).json()["usage"]["used_today"] == 2
    assert client.get("/api/ai/usage", headers=user_a).json()["remaining"] == 18


def test_daily_limit_blocks_extra_generations(client_factory):
    client = client_factory(ai_daily_generation_limit=2)
    headers = auth_headers(client, "ana@example.com")
    assert generate(client, headers).status_code == 200
    assert generate(client, headers).status_code == 200
    blocked = generate(client, headers)
    assert blocked.status_code == 429
    assert blocked.json()["code"] == "AI_LIMIT_REACHED"
    assert "Limite diário" in blocked.json()["detail"]
    assert len(client.app.state.fake_provider.calls) == 2  # o provedor nem foi chamado
    usage = client.get("/api/ai/usage", headers=headers).json()
    assert (usage["used_today"], usage["limit"], usage["remaining"]) == (2, 2, 0)


def test_daily_limit_applies_to_campaigns_too(client_factory):
    client = client_factory(ai_daily_generation_limit=1)
    headers = auth_headers(client, "ana@example.com")
    assert generate(client, headers).status_code == 200
    response = client.post("/api/ai/generate-campaign", headers=headers, json=campaign_generate_payload())
    assert response.status_code == 429


def test_limit_is_per_user(client_factory):
    client = client_factory(ai_daily_generation_limit=1)
    ana = auth_headers(client, "ana@example.com")
    bruno = auth_headers(client, "bruno@example.com")
    assert generate(client, ana).status_code == 200
    assert generate(client, ana).status_code == 429
    assert generate(client, bruno).status_code == 200


def test_client_cannot_bypass_limit_by_sending_limit_fields(client_factory):
    client = client_factory(ai_daily_generation_limit=1)
    headers = auth_headers(client, "ana@example.com")
    generate(client, headers)
    response = client.post(
        "/api/ai/generate?limit=999",
        headers={**headers, "X-Daily-Limit": "999"},
        json=generate_payload(limit=999, daily_limit=999, used_today=0),
    )
    assert response.status_code == 429


def test_generations_from_previous_days_do_not_count(client_factory):
    client = client_factory(ai_daily_generation_limit=1)
    headers = auth_headers(client, "ana@example.com")
    with client.app.state.session_factory() as db:
        db.add(
            AIGeneration(
                user_id=1,
                generation_type="title",
                status="success",
                created_at=datetime.now(timezone.utc) - timedelta(days=2),
            )
        )
        db.commit()
    assert client.get("/api/ai/usage", headers=headers).json()["used_today"] == 0
    assert generate(client, headers).status_code == 200


def test_usage_endpoint_starts_at_zero_and_reports_reset_time(client, user_a):
    body = client.get("/api/ai/usage", headers=user_a).json()
    assert (body["used_today"], body["limit"], body["remaining"]) == (0, 20, 20)
    assert datetime.fromisoformat(body["resets_at"].replace("Z", "+00:00")) > datetime.now(timezone.utc)


# ---------- erros do provedor ----------


@pytest.mark.parametrize(
    ("error", "status_code", "code"),
    [
        (AITimeoutError(), 504, "AI_TIMEOUT"),
        (AIProviderError(), 503, "AI_UNAVAILABLE"),
        (AIInvalidResponseError(), 502, "AI_INVALID_RESPONSE"),
        (AIAuthError("Problema de configuração."), 502, "AI_PROVIDER_AUTH"),
        (RuntimeError("erro interno com segredo sk-123"), 503, "AI_UNAVAILABLE"),
    ],
)
def test_provider_errors_are_controlled_and_do_not_consume_limit(client, user_a, fake_ai, error, status_code, code):
    fake_ai.error = error
    response = generate(client, user_a)
    assert response.status_code == status_code
    assert response.json()["code"] == code
    assert "sk-123" not in response.text and "Traceback" not in response.text
    assert "generated_content" not in response.json()  # nunca devolve conteúdo inventado
    assert client.get("/api/ai/usage", headers=user_a).json()["used_today"] == 0

    fake_ai.error = None  # nova tentativa posterior funciona
    assert generate(client, user_a).status_code == 200
    assert client.get("/api/ai/usage", headers=user_a).json()["used_today"] == 1


def test_missing_ai_configuration_returns_503_without_consuming_limit(client_factory):
    client = client_factory(fake_provider=False, ai_api_key="", ai_api_url="", ai_model="")
    headers = auth_headers(client, "ana@example.com")
    response = generate(client, headers)
    assert response.status_code == 503
    assert response.json()["code"] == "AI_NOT_CONFIGURED"
    assert client.get("/api/ai/usage", headers=headers).json()["used_today"] == 0


# ---------- provedor OpenAI-compatível (HTTP simulado com httpx.MockTransport) ----------


def make_provider(handler) -> OpenAICompatibleProvider:
    return OpenAICompatibleProvider(
        api_url="https://ai.example.test/v1/chat/completions",
        api_key="secret-key",
        model="test-model",
        timeout=5,
        transport=httpx.MockTransport(handler),
    )


def call(provider):
    return provider.generate(system_prompt="sistema", user_prompt="usuário")


def test_provider_sends_expected_request_and_parses_response():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["auth"] = request.headers["authorization"]
        captured["url"] = str(request.url)
        captured["json"] = request.read().decode()
        return httpx.Response(200, json={"choices": [{"message": {"content": "  Olá!  "}}]})

    assert call(make_provider(handler)) == "Olá!"
    assert captured["auth"] == "Bearer secret-key"
    assert captured["url"] == "https://ai.example.test/v1/chat/completions"
    assert '"model":"test-model"' in captured["json"].replace(" ", "")


def test_provider_timeout_becomes_ai_timeout_error():
    def handler(request):
        raise httpx.ReadTimeout("lento", request=request)

    with pytest.raises(AITimeoutError):
        call(make_provider(handler))


def test_provider_network_error_becomes_provider_error():
    def handler(request):
        raise httpx.ConnectError("sem rede", request=request)

    with pytest.raises(AIProviderError) as info:
        call(make_provider(handler))
    assert not isinstance(info.value, AITimeoutError)


@pytest.mark.parametrize("status", [401, 403])
def test_provider_auth_error(status):
    with pytest.raises(AIAuthError):
        call(make_provider(lambda request: httpx.Response(status, json={"error": "chave inválida"})))


def test_provider_rate_limit_and_server_errors():
    for status in (429, 500, 502, 503):
        with pytest.raises(AIProviderError):
            call(make_provider(lambda request, s=status: httpx.Response(s)))


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(200, text="não é json"),
        httpx.Response(200, json={}),
        httpx.Response(200, json={"choices": []}),
        httpx.Response(200, json={"choices": [{"message": {}}]}),
        httpx.Response(200, json={"choices": [{"message": {"content": "   "}}]}),
        httpx.Response(200, json={"choices": [{"message": {"content": None}}]}),
    ],
)
def test_provider_invalid_response(response):
    with pytest.raises(AIInvalidResponseError):
        call(make_provider(lambda request: response))


def test_build_provider_requires_configuration(client_factory):
    from app.services.ai.provider import build_provider
    from tests.conftest import make_settings

    with pytest.raises(AINotConfiguredError):
        build_provider(make_settings(ai_api_key=""))
    assert isinstance(build_provider(make_settings()), OpenAICompatibleProvider)
