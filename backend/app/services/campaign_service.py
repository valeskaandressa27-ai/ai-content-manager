from __future__ import annotations

from app.core.errors import NotFoundError
from app.models import Campaign, User
from app.repositories.campaign_repository import CampaignRepository
from app.schemas.campaign import CampaignCreate, CampaignRead, CampaignUpdate
from app.schemas.common import Page, build_page

NOT_FOUND = "Campanha não encontrada."
REQUIRED_FIELDS = {"name", "product_or_service", "generated_content"}


class CampaignService:
    def __init__(self, campaigns: CampaignRepository) -> None:
        self.campaigns = campaigns

    def create(self, user: User, payload: CampaignCreate) -> Campaign:
        return self.campaigns.add(Campaign(user_id=user.id, **payload.model_dump()))

    def list(self, user: User, *, search: str | None, page: int, page_size: int) -> Page[CampaignRead]:
        items, total = self.campaigns.list_owned(user.id, search=search, page=page, page_size=page_size)
        return build_page([CampaignRead.model_validate(item) for item in items], total, page, page_size)

    def get(self, user: User, campaign_id: int) -> Campaign:
        campaign = self.campaigns.get_owned(user.id, campaign_id)
        if campaign is None:
            raise NotFoundError(NOT_FOUND)
        return campaign

    def update(self, user: User, campaign_id: int, payload: CampaignUpdate) -> Campaign:
        campaign = self.get(user, campaign_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            if value is None and field in REQUIRED_FIELDS:
                continue
            setattr(campaign, field, value)
        return self.campaigns.save(campaign)

    def delete(self, user: User, campaign_id: int) -> None:
        self.campaigns.delete(self.get(user, campaign_id))
