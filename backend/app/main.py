from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.database.session import create_db_engine, create_session_factory
from app.routers import ai, auth, campaigns, company, contents, dashboard, health, users
from app.spa import mount_spa

TAGS_METADATA = [
    {"name": "Authentication", "description": "Cadastro, login (JWT) e usuário autenticado."},
    {"name": "Users", "description": "Perfil do usuário."},
    {"name": "Company", "description": "Perfil da empresa, usado como contexto da IA."},
    {"name": "Contents", "description": "Biblioteca de conteúdos salvos."},
    {"name": "Campaigns", "description": "Campanhas geradas e salvas."},
    {"name": "AI", "description": "Geração com IA e consumo diário."},
    {"name": "Dashboard", "description": "Indicadores do usuário."},
    {"name": "Health", "description": "Verificação de saúde da aplicação."},
]


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    engine = create_db_engine(settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        engine.dispose()

    app = FastAPI(
        title="AI Content Manager API",
        description="API do AI Content Manager: geração e gestão de conteúdos de marketing com IA.",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        openapi_tags=TAGS_METADATA,
        debug=False,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)

    if settings.cors_origins_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins_list,
            allow_credentials=False,  # autenticação por Bearer token, sem cookies
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
        )

    register_exception_handlers(app)

    for router in (auth, users, company, contents, campaigns, ai, dashboard):
        app.include_router(router.router, prefix="/api")
    app.include_router(health.router)

    mount_spa(app, settings.frontend_dist_path)  # sempre por último (catch-all)
    return app


app = create_app()
