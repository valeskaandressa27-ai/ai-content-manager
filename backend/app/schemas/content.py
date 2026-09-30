from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import ContentStatus, ContentType
from app.schemas.common import required_text, validate_input_data


class ContentCreate(BaseModel):
    type: ContentType
    title: required_text(200)
    generated_content: required_text(20_000)
    input_data: dict[str, Any] | None = None
    status: ContentStatus = ContentStatus.saved
    generation_id: int | None = None

    _check_input = field_validator("input_data")(validate_input_data)


class ContentUpdate(BaseModel):
    title: required_text(200) | None = None
    generated_content: required_text(20_000) | None = None
    status: ContentStatus | None = None


class ContentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: ContentType
    title: str
    input_data: dict[str, Any] | None
    generated_content: str
    status: ContentStatus
    created_at: datetime
    updated_at: datetime
