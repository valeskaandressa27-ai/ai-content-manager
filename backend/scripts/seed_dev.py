"""Popula o banco LOCAL com dados de demonstração (somente desenvolvimento).

Uso (dentro de backend/):  python -m scripts.seed_dev
Cria o usuário demo@example.com / Demo1234 com uma empresa, conteúdos e uma campanha.
Os textos são exemplos escritos à mão, NÃO gerados por IA. Recusa rodar em produção.
"""

from __future__ import annotations

import sys

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.database.session import create_db_engine, create_session_factory
from app.models import Campaign, Company, Content, User

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "Demo1234"


def main() -> int:
    settings = get_settings()
    if settings.is_production:
        print("Recusado: o seed de demonstração não roda com ENVIRONMENT=production.")
        return 1

    session_factory = create_session_factory(create_db_engine(settings))
    with session_factory() as db:
        if db.scalar(select(User).where(User.email == DEMO_EMAIL)):
            print(f"O usuário {DEMO_EMAIL} já existe. Nada a fazer.")
            return 0

        user = User(name="Usuária Demo", email=DEMO_EMAIL, password_hash=hash_password(DEMO_PASSWORD))
        db.add(user)
        db.flush()
        db.add(
            Company(
                user_id=user.id,
                name="Estúdio Exemplo (demo)",
                segment="Salão de beleza",
                description="Empresa fictícia usada apenas para demonstração em ambiente local.",
                target_audience="Mulheres de 25 a 45 anos",
                communication_tone="Acolhedor",
                brand_information="Atendimento personalizado.",
            )
        )
        db.add(
            Content(
                user_id=user.id,
                type="instagram_caption",
                title="[DEMO] Legenda de exemplo",
                generated_content="Texto de exemplo para demonstração local.",
                input_data={"product_or_service": "Serviço de exemplo"},
                status="saved",
            )
        )
        db.add(
            Campaign(
                user_id=user.id,
                name="[DEMO] Campanha de exemplo",
                product_or_service="Serviço de exemplo",
                generated_content="CONCEITO DA CAMPANHA\nTexto de exemplo para demonstração local.",
            )
        )
        db.commit()
    print(f"Dados de DESENVOLVIMENTO criados. Login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
