"""Esquema inicial: users, companies, contents, campaigns, ai_generations

Revision ID: 0001
Revises:
Create Date: 2026-09-28
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("segment", sa.String(150)),
        sa.Column("description", sa.Text()),
        sa.Column("target_audience", sa.Text()),
        sa.Column("communication_tone", sa.String(100)),
        sa.Column("brand_information", sa.Text()),
        *_timestamps(),
    )

    op.create_table(
        "contents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("input_data", sa.JSON()),
        sa.Column("generated_content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_contents_user_created", "contents", ["user_id", "created_at"])
    op.create_index("ix_contents_user_type", "contents", ["user_id", "type"])
    op.create_index("ix_contents_user_status", "contents", ["user_id", "status"])

    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("product_or_service", sa.String(200), nullable=False),
        sa.Column("objective", sa.String(300)),
        sa.Column("target_audience", sa.String(300)),
        sa.Column("period", sa.String(150)),
        sa.Column("tone", sa.String(100)),
        sa.Column("additional_info", sa.Text()),
        sa.Column("generated_content", sa.Text(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_campaigns_user_created", "campaigns", ["user_id", "created_at"])

    op.create_table(
        "ai_generations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content_id", sa.Integer(), sa.ForeignKey("contents.id", ondelete="SET NULL")),
        sa.Column("generation_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ai_generations_user_created", "ai_generations", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_generations_user_created", table_name="ai_generations")
    op.drop_table("ai_generations")
    op.drop_index("ix_campaigns_user_created", table_name="campaigns")
    op.drop_table("campaigns")
    op.drop_index("ix_contents_user_status", table_name="contents")
    op.drop_index("ix_contents_user_type", table_name="contents")
    op.drop_index("ix_contents_user_created", table_name="contents")
    op.drop_table("contents")
    op.drop_table("companies")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
