from __future__ import annotations

from app.models import User
from app.models.enums import ContentStatus
from app.repositories.ai_generation_repository import AIGenerationRepository
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.content_repository import ContentRepository
from app.schemas.dashboard import (
    ContentsByType,
    DashboardRead,
    DashboardTotals,
    RecentActivity,
    RecentGeneration,
)
from app.services.usage_service import UsageService

USAGE_DAYS = 14
RECENT_LIMIT = 5
ACTIVITY_LIMIT = 8


class DashboardService:
    def __init__(
        self,
        contents: ContentRepository,
        campaigns: CampaignRepository,
        generations: AIGenerationRepository,
        usage: UsageService,
    ) -> None:
        self.contents = contents
        self.campaigns = campaigns
        self.generations = generations
        self.usage = usage

    def build(self, user: User) -> DashboardRead:
        activity = [
            RecentActivity(kind="content", id=c.id, title=c.title, created_at=c.created_at)
            for c in self.contents.recent(user.id, ACTIVITY_LIMIT)
        ] + [
            RecentActivity(kind="campaign", id=c.id, title=c.name, created_at=c.created_at)
            for c in self.campaigns.recent(user.id, ACTIVITY_LIMIT)
        ]
        activity.sort(key=lambda item: item.created_at, reverse=True)

        return DashboardRead(
            totals=DashboardTotals(
                contents=self.contents.count(user.id),
                saved_contents=self.contents.count(user.id, ContentStatus.saved.value),
                campaigns=self.campaigns.count(user.id),
                generations=self.generations.count_success(user.id),
            ),
            usage=self.usage.snapshot(user.id),
            contents_by_type=[
                ContentsByType(type=type_, count=count) for type_, count in self.contents.count_by_type(user.id)
            ],
            usage_last_days=self.usage.daily_counts(user.id, USAGE_DAYS),
            recent_generations=[
                RecentGeneration(
                    id=g.id, generation_type=g.generation_type, content_id=g.content_id, created_at=g.created_at
                )
                for g in self.generations.recent_success(user.id, RECENT_LIMIT)
            ],
            recent_activity=activity[:ACTIVITY_LIMIT],
        )
