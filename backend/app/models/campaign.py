from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.mixins import TimestampMixin


class Campaign(TimestampMixin, Base):
    __tablename__ = "campaigns"
    __table_args__ = (Index("ix_campaigns_user_created", "user_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    product_or_service: Mapped[str] = mapped_column(String(200), nullable=False)
    objective: Mapped[str | None] = mapped_column(String(300))
    target_audience: Mapped[str | None] = mapped_column(String(300))
    period: Mapped[str | None] = mapped_column(String(150))
    tone: Mapped[str | None] = mapped_column(String(100))
    additional_info: Mapped[str | None] = mapped_column(Text)
    generated_content: Mapped[str] = mapped_column(Text, nullable=False)
