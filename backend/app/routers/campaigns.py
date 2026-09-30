from fastapi import APIRouter, Depends, Query, Response, status

from app.dependencies.auth import get_current_user
from app.dependencies.services import get_campaign_service
from app.models import User
from app.schemas.campaign import CampaignCreate, CampaignRead, CampaignUpdate
from app.schemas.common import Page
from app.services.campaign_service import CampaignService

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


@router.get("", response_model=Page[CampaignRead], summary="Listar campanhas (paginado)")
def list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: str | None = Query(None, max_length=100, description="Busca no nome e no produto/serviço"),
    user: User = Depends(get_current_user),
    service: CampaignService = Depends(get_campaign_service),
):
    return service.list(user, search=search.strip() if search else None, page=page, page_size=page_size)


@router.post("", response_model=CampaignRead, status_code=status.HTTP_201_CREATED, summary="Salvar campanha")
def create_campaign(
    payload: CampaignCreate, user: User = Depends(get_current_user), service: CampaignService = Depends(get_campaign_service)
):
    return service.create(user, payload)


@router.get("/{campaign_id}", response_model=CampaignRead, summary="Detalhar campanha")
def get_campaign(
    campaign_id: int, user: User = Depends(get_current_user), service: CampaignService = Depends(get_campaign_service)
):
    return service.get(user, campaign_id)


@router.patch("/{campaign_id}", response_model=CampaignRead, summary="Editar campanha")
def update_campaign(
    campaign_id: int,
    payload: CampaignUpdate,
    user: User = Depends(get_current_user),
    service: CampaignService = Depends(get_campaign_service),
):
    return service.update(user, campaign_id, payload)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir campanha")
def delete_campaign(
    campaign_id: int, user: User = Depends(get_current_user), service: CampaignService = Depends(get_campaign_service)
):
    service.delete(user, campaign_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
