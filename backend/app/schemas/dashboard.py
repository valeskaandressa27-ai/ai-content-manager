from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.ai import UsageRead


class DashboardTotals(BaseModel):
    contents: int
    saved_contents: int
    campaigns: int
    generations: int


class ContentsByType(BaseModel):
    type: str
    count: int


class DailyUsage(BaseModel):
    date: date
    count: int


class RecentGeneration(BaseModel):
    id: int
    generation_type: str
    content_id: int | None
    created_at: datetime


class RecentActivity(BaseModel):
    kind: Literal["content", "campaign"]
    id: int
    title: str
    created_at: datetime


class DashboardRead(BaseModel):
    totals: DashboardTotals
    usage: UsageRead
    contents_by_type: list[ContentsByType]
    usage_last_days: list[DailyUsage]
    recent_generations: list[RecentGeneration]
    recent_activity: list[RecentActivity]
