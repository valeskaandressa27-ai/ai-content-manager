from __future__ import annotations

from app.core.errors import NotFoundError
from app.models import Content, User
from app.repositories.ai_generation_repository import AIGenerationRepository
from app.repositories.content_repository import ContentRepository
from app.schemas.common import Page, build_page
from app.schemas.content import ContentCreate, ContentRead, ContentUpdate

NOT_FOUND = "Conteúdo não encontrado."


class ContentService:
    def __init__(self, contents: ContentRepository, generations: AIGenerationRepository) -> None:
        self.contents = contents
        self.generations = generations

    def create(self, user: User, payload: ContentCreate) -> Content:
        generation = None
        if payload.generation_id is not None:
            generation = self.generations.get_owned(user.id, payload.generation_id)
            if generation is None:
                raise NotFoundError("Geração não encontrada.")

        content = self.contents.add(
            Content(
                user_id=user.id,
                type=payload.type.value,
                title=payload.title,
                generated_content=payload.generated_content,
                input_data=payload.input_data,
                status=payload.status.value,
            )
        )
        if generation is not None and generation.content_id is None:
            generation.content_id = content.id
            self.generations.save(generation)
        return content

    def list(
        self,
        user: User,
        *,
        search: str | None,
        content_type: str | None,
        status: str | None,
        page: int,
        page_size: int,
    ) -> Page[ContentRead]:
        items, total = self.contents.list_owned(
            user.id, search=search, content_type=content_type, status=status, page=page, page_size=page_size
        )
        return build_page([ContentRead.model_validate(item) for item in items], total, page, page_size)

    def get(self, user: User, content_id: int) -> Content:
        content = self.contents.get_owned(user.id, content_id)
        if content is None:
            raise NotFoundError(NOT_FOUND)
        return content

    def update(self, user: User, content_id: int, payload: ContentUpdate) -> Content:
        content = self.get(user, content_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            if value is None:
                continue  # campos obrigatórios não podem ser anulados
            setattr(content, field, getattr(value, "value", value))
        return self.contents.save(content)

    def delete(self, user: User, content_id: int) -> None:
        self.contents.delete(self.get(user, content_id))
