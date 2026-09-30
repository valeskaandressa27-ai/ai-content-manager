from fastapi import APIRouter, Depends, Query, Response, status

from app.dependencies.auth import get_current_user
from app.dependencies.services import get_content_service
from app.models import User
from app.models.enums import ContentStatus, ContentType
from app.schemas.common import Page
from app.schemas.content import ContentCreate, ContentRead, ContentUpdate
from app.services.content_service import ContentService

router = APIRouter(prefix="/contents", tags=["Contents"])


@router.get("", response_model=Page[ContentRead], summary="Listar conteúdos (paginado)")
def list_contents(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: str | None = Query(None, max_length=100, description="Busca no título e no texto"),
    type: ContentType | None = Query(None, description="Filtrar por tipo"),
    status: ContentStatus | None = Query(None, description="Filtrar por status"),
    user: User = Depends(get_current_user),
    service: ContentService = Depends(get_content_service),
):
    return service.list(
        user,
        search=search.strip() if search else None,
        content_type=type.value if type else None,
        status=status.value if status else None,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ContentRead, status_code=status.HTTP_201_CREATED, summary="Salvar conteúdo")
def create_content(
    payload: ContentCreate, user: User = Depends(get_current_user), service: ContentService = Depends(get_content_service)
):
    return service.create(user, payload)


@router.get("/{content_id}", response_model=ContentRead, summary="Detalhar conteúdo")
def get_content(
    content_id: int, user: User = Depends(get_current_user), service: ContentService = Depends(get_content_service)
):
    return service.get(user, content_id)


@router.patch("/{content_id}", response_model=ContentRead, summary="Editar conteúdo")
def update_content(
    content_id: int,
    payload: ContentUpdate,
    user: User = Depends(get_current_user),
    service: ContentService = Depends(get_content_service),
):
    return service.update(user, content_id, payload)


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir conteúdo")
def delete_content(
    content_id: int, user: User = Depends(get_current_user), service: ContentService = Depends(get_content_service)
):
    service.delete(user, content_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
