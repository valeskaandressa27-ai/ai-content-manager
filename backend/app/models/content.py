from typing import Any

from sqlalchemy import ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.mixins import TimestampMixin


class Content(TimestampMixin, Base):
    __tablename__ = "contents"
    __table_args__ = (
        Index("ix_contents_user_created", "user_id", "created_at"),
        Index("ix_contents_user_type", "user_id", "type"),
        Index("ix_contents_user_status", "user_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    input_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    generated_content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
