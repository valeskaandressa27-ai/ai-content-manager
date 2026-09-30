from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AIGeneration, User
from app.models.enums import GenerationStatus

# "pending" conta para o limite: reserva a vaga antes de chamar o provedor.
COUNTED_STATUSES = (GenerationStatus.pending.value, GenerationStatus.success.value)


class AIGenerationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def lock_user(self, user_id: int) -> None:
        """Serializa gerações concorrentes do mesmo usuário (SELECT ... FOR UPDATE no PostgreSQL)."""
        self.db.execute(select(User.id).where(User.id == user_id).with_for_update())

    def rollback(self) -> None:
        self.db.rollback()

    def add(self, generation: AIGeneration) -> AIGeneration:
        self.db.add(generation)
        self.db.commit()
        return generation

    def save(self, generation: AIGeneration) -> AIGeneration:
        self.db.commit()
        return generation

    def get_owned(self, user_id: int, generation_id: int) -> AIGeneration | None:
        return self.db.scalar(
            select(AIGeneration).where(AIGeneration.id == generation_id, AIGeneration.user_id == user_id)
        )

    def count_counted_between(self, user_id: int, start: datetime, end: datetime) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(AIGeneration)
                .where(
                    AIGeneration.user_id == user_id,
                    AIGeneration.status.in_(COUNTED_STATUSES),
                    AIGeneration.created_at >= start,
                    AIGeneration.created_at < end,
                )
            )
            or 0
        )

    def created_at_since(self, user_id: int, since: datetime) -> list[datetime]:
        return list(
            self.db.scalars(
                select(AIGeneration.created_at).where(
                    AIGeneration.user_id == user_id,
                    AIGeneration.status == GenerationStatus.success.value,
                    AIGeneration.created_at >= since,
                )
            ).all()
        )

    def count_success(self, user_id: int) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(AIGeneration)
                .where(AIGeneration.user_id == user_id, AIGeneration.status == GenerationStatus.success.value)
            )
            or 0
        )

    def recent_success(self, user_id: int, limit: int) -> list[AIGeneration]:
        return list(
            self.db.scalars(
                select(AIGeneration)
                .where(AIGeneration.user_id == user_id, AIGeneration.status == GenerationStatus.success.value)
                .order_by(AIGeneration.created_at.desc(), AIGeneration.id.desc())
                .limit(limit)
            ).all()
        )
