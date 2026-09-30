from __future__ import annotations

import json
from typing import Annotated, Any, Generic, TypeVar

from pydantic import BaseModel, BeforeValidator, Field, StringConstraints

T = TypeVar("T")


def _blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def required_text(max_length: int, min_length: int = 1):
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length)]


def optional_text(max_length: int):
    inner = Annotated[str, StringConstraints(strip_whitespace=True, max_length=max_length)]
    return Annotated[inner | None, BeforeValidator(_blank_to_none), Field(default=None)]


def validate_input_data(value: dict[str, Any] | None) -> dict[str, Any] | None:
    if value is not None and len(json.dumps(value, ensure_ascii=False)) > 10_000:
        raise ValueError("Dados de entrada muito grandes.")
    return value


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


def build_page(items: list[T], total: int, page: int, page_size: int) -> Page[T]:
    pages = max(1, -(-total // page_size))
    return Page[T](items=items, total=total, page=page, page_size=page_size, pages=pages)
