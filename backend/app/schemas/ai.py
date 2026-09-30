from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.enums import ContentLength, ContentType
from app.schemas.common import optional_text, required_text


class ContentGenerateRequest(BaseModel):
    content_type: ContentType
    product_or_service: required_text(200)
    target_audience: optional_text(300)
    objective: optional_text(300)
    tone: optional_text(100)
    length: ContentLength = ContentLength.medium
    additional_info: optional_text(1000)
    use_company_context: bool = True


class CampaignGenerateRequest(BaseModel):
    name: required_text(150, min_length=2)
    product_or_service: required_text(200)
    objective: optional_text(300)
    target_audience: optional_text(300)
    period: optional_text(150)
    tone: optional_text(100)
    additional_info: optional_text(1000)
    use_company_context: bool = True


class UsageRead(BaseModel):
    used_today: int
    limit: int
    remaining: int
    resets_at: datetime


class GenerationResponse(BaseModel):
    generation_id: int
    generated_content: str
    usage: UsageRead
