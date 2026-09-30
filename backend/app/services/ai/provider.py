"""Abstração do provedor de IA + implementação para APIs compatíveis com o formato OpenAI."""

from __future__ import annotations

import logging
from typing import Protocol

import httpx

from app.core.config import Settings
from app.core.errors import (
    AIAuthError,
    AIInvalidResponseError,
    AINotConfiguredError,
    AIProviderError,
    AITimeoutError,
)

logger = logging.getLogger("app.ai")


class AIProvider(Protocol):
    """Contrato que qualquer provedor precisa cumprir. Troque a implementação sem tocar no restante."""

    def generate(self, *, system_prompt: str, user_prompt: str) -> str: ...


class OpenAICompatibleProvider:
    """Chama um endpoint /chat/completions (OpenAI, Groq, OpenRouter, Gemini compat, etc.)."""

    def __init__(
        self,
        *,
        api_url: str,
        api_key: str,
        model: str,
        timeout: float,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._api_url = api_url
        self._api_key = api_key
        self._model = model
        self._timeout = timeout
        self._transport = transport

    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        headers = {"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"}

        try:
            with httpx.Client(timeout=self._timeout, transport=self._transport) as client:
                response = client.post(self._api_url, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            logger.warning("Timeout ao chamar o provedor de IA")
            raise AITimeoutError() from exc
        except httpx.HTTPError as exc:
            logger.warning("Falha de rede ao chamar o provedor de IA: %s", type(exc).__name__)
            raise AIProviderError() from exc

        return self._parse(response)

    @staticmethod
    def _parse(response: httpx.Response) -> str:
        status = response.status_code
        if status in (401, 403):
            logger.error("Provedor de IA recusou as credenciais (HTTP %s). Verifique AI_API_KEY.", status)
            raise AIAuthError("Serviço de IA indisponível no momento por um problema de configuração.")
        if status == 429:
            logger.warning("Provedor de IA aplicou rate limit (HTTP 429)")
            raise AIProviderError("O serviço de IA está com muitas requisições. Tente novamente em instantes.")
        if status >= 400:
            logger.error("Provedor de IA respondeu HTTP %s", status)
            raise AIProviderError()

        try:
            text = response.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            logger.error("Resposta do provedor de IA em formato inesperado")
            raise AIInvalidResponseError() from exc
        if not isinstance(text, str) or not text.strip():
            logger.error("Provedor de IA retornou conteúdo vazio")
            raise AIInvalidResponseError()
        return text.strip()


def build_provider(settings: Settings) -> AIProvider:
    if not settings.ai_configured:
        raise AINotConfiguredError("O serviço de IA ainda não foi configurado neste ambiente.")
    return OpenAICompatibleProvider(
        api_url=settings.ai_api_url,
        api_key=settings.ai_api_key,
        model=settings.ai_model,
        timeout=settings.ai_timeout_seconds,
    )
