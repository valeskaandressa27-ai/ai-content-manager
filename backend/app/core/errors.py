"""Exceções de domínio e handlers globais com respostas de erro padronizadas."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app")


class AppError(Exception):
    """Erro controlado da aplicação. Vira {"detail": ..., "code": ...} na resposta."""

    status_code = 400
    code = "BAD_REQUEST"
    message = "Requisição inválida."

    def __init__(self, message: str | None = None, *, code: str | None = None) -> None:
        self.message = message or self.message
        self.code = code or self.code
        super().__init__(self.message)


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"
    message = "Credenciais inválidas."


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"
    message = "Recurso não encontrado."


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
    message = "Conflito com o estado atual do recurso."


class AILimitReachedError(AppError):
    status_code = 429
    code = "AI_LIMIT_REACHED"
    message = "Limite diário de IA atingido."


class AIProviderError(AppError):
    """Falha do provedor de IA. Detalhes técnicos ficam apenas nos logs."""

    status_code = 503
    code = "AI_UNAVAILABLE"
    message = "Serviço de IA temporariamente indisponível. Tente novamente em instantes."


class AITimeoutError(AIProviderError):
    status_code = 504
    code = "AI_TIMEOUT"
    message = "O serviço de IA demorou demais para responder. Tente novamente."


class AIInvalidResponseError(AIProviderError):
    status_code = 502
    code = "AI_INVALID_RESPONSE"
    message = "O serviço de IA retornou uma resposta inválida. Tente novamente."


class AIAuthError(AIProviderError):
    status_code = 502
    code = "AI_PROVIDER_AUTH"


class AINotConfiguredError(AIProviderError):
    code = "AI_NOT_CONFIGURED"


_VALIDATION_MESSAGES = {
    "missing": "Campo obrigatório.",
    "string_too_short": "Valor muito curto.",
    "string_too_long": "Valor muito longo.",
    "string_type": "Valor inválido.",
    "int_parsing": "Informe um número inteiro.",
    "int_type": "Informe um número inteiro.",
    "greater_than_equal": "Valor abaixo do mínimo permitido.",
    "less_than_equal": "Valor acima do máximo permitido.",
    "enum": "Opção inválida.",
    "literal_error": "Opção inválida.",
    "json_invalid": "JSON inválido.",
    "extra_forbidden": "Campo não permitido.",
}


def _validation_errors(exc: RequestValidationError) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    for err in exc.errors():
        location = [str(part) for part in err.get("loc", ()) if part not in ("body", "query", "path")]
        error_type = err.get("type", "")
        message = str(err.get("msg", ""))
        if error_type == "value_error":
            # Mensagens levantadas por nossos validators já estão em português.
            message = message.removeprefix("Value error, ")
            if "email" in location:
                message = "E-mail inválido."
        else:
            message = _VALIDATION_MESSAGES.get(error_type, "Valor inválido.")
        errors.append({"field": ".".join(location), "message": message})
    return errors


def _json(status_code: int, content: dict[str, Any], headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=content, headers=headers)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
        return _json(exc.status_code, {"detail": exc.message, "code": exc.code}, headers)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Erro na requisição."
        if exc.status_code == 404:
            detail = "Recurso não encontrado."
        elif exc.status_code == 405:
            detail = "Método não permitido."
        return _json(exc.status_code, {"detail": detail, "code": "HTTP_ERROR"}, dict(exc.headers or {}))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _json(
            422,
            {"detail": "Dados inválidos.", "code": "VALIDATION_ERROR", "errors": _validation_errors(exc)},
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Erro não tratado em %s %s", request.method, request.url.path, exc_info=exc)
        return _json(500, {"detail": "Erro interno do servidor. Tente novamente mais tarde.", "code": "INTERNAL_ERROR"})
