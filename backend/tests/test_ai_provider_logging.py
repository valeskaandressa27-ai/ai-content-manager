import logging

import httpx
import pytest

from app.core.errors import AIProviderError
from app.services.ai.provider import OpenAICompatibleProvider


def test_network_exception_never_logs_authorization_secret(caplog):
    secret = "gsk-test-secret-that-must-never-appear-in-logs"

    def handler(request: httpx.Request) -> httpx.Response:
        # Simula bibliotecas HTTP que incluem dados sensíveis no texto da exceção.
        raise httpx.ConnectError(f"request failed; Authorization: Bearer {secret}", request=request)

    provider = OpenAICompatibleProvider(
        api_url="https://api.groq.com/openai/v1/chat/completions",
        api_key=secret,
        model="openai/gpt-oss-120b",
        timeout=5,
        transport=httpx.MockTransport(handler),
    )

    with caplog.at_level(logging.WARNING, logger="app.ai"):
        with pytest.raises(AIProviderError):
            provider.generate(system_prompt="system", user_prompt="user")

    assert secret not in caplog.text
    assert "Authorization" not in caplog.text
    assert "ConnectError" in caplog.text
