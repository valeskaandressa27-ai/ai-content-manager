#!/bin/sh
# Aplica as migrations e inicia a API. Usa a porta fornecida pelo ambiente (Render define PORT).
set -e
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*"
