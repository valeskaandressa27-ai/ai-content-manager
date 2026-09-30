"""Serve o build de produção do Angular pelo próprio FastAPI, com fallback para rotas da SPA."""

from __future__ import annotations

import logging
import re
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, Response

logger = logging.getLogger("app")

HASHED_ASSET = re.compile(r"[-.][A-Za-z0-9]{8,}\.(js|css|woff2?|ttf|svg|png|jpg|webp)$")
IMMUTABLE = {"Cache-Control": "public, max-age=31536000, immutable"}
NO_CACHE = {"Cache-Control": "no-cache"}


def mount_spa(app: FastAPI, dist_dir: Path) -> bool:
    """Registra a rota catch-all. Deve ser chamada depois de todas as rotas da API."""
    root = dist_dir.resolve()
    index = root / "index.html"
    if not index.is_file():
        logger.info("Build do frontend não encontrado em %s; servindo apenas a API.", root)
        return False

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str) -> Response:
        if full_path == "api" or full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Recurso não encontrado.", "code": "NOT_FOUND"})

        candidate = (root / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(root):
            headers = IMMUTABLE if HASHED_ASSET.search(candidate.name) else None
            return FileResponse(candidate, headers=headers)

        # Arquivo com extensão inexistente (ex.: /missing.js) deve ser 404, não a SPA.
        if Path(full_path).suffix:
            return JSONResponse(status_code=404, content={"detail": "Recurso não encontrado.", "code": "NOT_FOUND"})
        return FileResponse(index, headers=NO_CACHE)

    return True
