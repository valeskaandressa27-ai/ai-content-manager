"""Entrypoint do FastAPI para o serviço backend da Vercel.

O serviço Vercel usa backend/ como raiz e detecta esta variável ASGI chamada app.
A aplicação original permanece em app.main; este arquivo apenas a expõe.
"""
from app.main import app

__all__ = ["app"]
