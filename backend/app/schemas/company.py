from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import optional_text, required_text


class CompanyUpsert(BaseModel):
    name: required_text(150, min_length=2)
    segment: optional_text(150)
    description: optional_text(2000)
    target_audience: optional_text(1000)
    communication_tone: optional_text(100)
    brand_information: optional_text(2000)


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    segment: str | None
    description: str | None
    target_audience: str | None
    communication_tone: str | None
    brand_information: str | None
    created_at: datetime
    updated_at: datetime
