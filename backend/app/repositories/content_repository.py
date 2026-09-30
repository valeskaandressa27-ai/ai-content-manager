from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Content
from app.repositories.queries import ilike_any


class ContentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_owned(self, user_id: int, content_id: int) -> Content | None:
        """Sempre filtra por dono: outro usuário nunca enxerga o registro."""
        return self.db.scalar(select(Content).where(Content.id == content_id, Content.user_id == user_id))

    def list_owned(
        self,
        user_id: int,
        *,
        search: str | None,
        content_type: str | None,
        status: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Content], int]:
        conditions = [Content.user_id == user_id]
        if search:
            conditions.append(ilike_any(search, Content.title, Content.generated_content))
        if content_type:
            conditions.append(Content.type == content_type)
        if status:
            conditions.append(Content.status == status)

        total = self.db.scalar(select(func.count()).select_from(Content).where(*conditions)) or 0
        items = self.db.scalars(
            select(Content)
            .where(*conditions)
            .order_by(Content.created_at.desc(), Content.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return list(items), total

    def add(self, content: Content) -> Content:
        self.db.add(content)
        self.db.commit()
        return content

    def save(self, content: Content) -> Content:
        self.db.commit()
        return content

    def delete(self, content: Content) -> None:
        self.db.delete(content)
        self.db.commit()

    def count(self, user_id: int, status: str | None = None) -> int:
        query = select(func.count()).select_from(Content).where(Content.user_id == user_id)
        if status:
            query = query.where(Content.status == status)
        return self.db.scalar(query) or 0

    def count_by_type(self, user_id: int) -> list[tuple[str, int]]:
        rows = self.db.execute(
            select(Content.type, func.count())
            .where(Content.user_id == user_id)
            .group_by(Content.type)
            .order_by(func.count().desc(), Content.type)
        ).all()
        return [(row[0], row[1]) for row in rows]

    def recent(self, user_id: int, limit: int) -> list[Content]:
        return list(
            self.db.scalars(
                select(Content).where(Content.user_id == user_id).order_by(Content.created_at.desc()).limit(limit)
            ).all()
        )
