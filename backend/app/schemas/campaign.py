from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import optional_text, required_text


class CampaignCreate(BaseModel):
    name: required_text(150, min_length=2)
    product_or_service: required_text(200)
    objective: optional_text(300)
    target_audience: optional_text(300)
    period: optional_text(150)
    tone: optional_text(100)
    additional_info: optional_text(1000)
    generated_content: required_text(30_000)


class CampaignUpdate(BaseModel):
    name: required_text(150, min_length=2) | None = None
    product_or_service: required_text(200) | None = None
    objective: optional_text(300)
    target_audience: optional_text(300)
    period: optional_text(150)
    tone: optional_text(100)
    additional_info: optional_text(1000)
    generated_content: required_text(30_000) | None = None


class CampaignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    product_or_service: str
    objective: str | None
    target_audience: str | None
    period: str | None
    tone: str | None
    additional_info: str | None
    generated_content: str
    created_at: datetime
    updated_at: datetime
