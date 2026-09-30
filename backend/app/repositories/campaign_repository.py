from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Campaign
from app.repositories.queries import ilike_any


class CampaignRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_owned(self, user_id: int, campaign_id: int) -> Campaign | None:
        return self.db.scalar(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == user_id))

    def list_owned(
        self, user_id: int, *, search: str | None, page: int, page_size: int
    ) -> tuple[list[Campaign], int]:
        conditions = [Campaign.user_id == user_id]
        if search:
            conditions.append(ilike_any(search, Campaign.name, Campaign.product_or_service))

        total = self.db.scalar(select(func.count()).select_from(Campaign).where(*conditions)) or 0
        items = self.db.scalars(
            select(Campaign)
            .where(*conditions)
            .order_by(Campaign.created_at.desc(), Campaign.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return list(items), total

    def add(self, campaign: Campaign) -> Campaign:
        self.db.add(campaign)
        self.db.commit()
        return campaign

    def save(self, campaign: Campaign) -> Campaign:
        self.db.commit()
        return campaign

    def delete(self, campaign: Campaign) -> None:
        self.db.delete(campaign)
        self.db.commit()

    def count(self, user_id: int) -> int:
        return self.db.scalar(select(func.count()).select_from(Campaign).where(Campaign.user_id == user_id)) or 0

    def recent(self, user_id: int, limit: int) -> list[Campaign]:
        return list(
            self.db.scalars(
                select(Campaign).where(Campaign.user_id == user_id).order_by(Campaign.created_at.desc()).limit(limit)
            ).all()
        )
