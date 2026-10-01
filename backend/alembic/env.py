from logging.config import fileConfig

from alembic import context
from sqlalchemy import text

from app import models  # noqa: F401  (registra os models no metadata)
from app.core.config import get_settings
from app.database.base import Base
from app.database.session import create_db_engine

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata
settings = get_settings()


def run_migrations_offline() -> None:
    context.configure(
        url=settings.sqlalchemy_database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # create_db_engine aplica DATABASE_SCHEMA (search_path) quando configurado.
    engine = create_db_engine(settings)
    with engine.connect() as connection:
        if settings.database_schema:
            # O nome já foi validado em Settings (somente [a-z0-9_]). Idempotente e não toca em outros schemas.
            connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{settings.database_schema}"'))
            connection.commit()
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
