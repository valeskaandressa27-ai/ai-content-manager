from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.dependencies.services import get_ai_service, get_usage_service
from app.models import User
from app.schemas.ai import CampaignGenerateRequest, ContentGenerateRequest, GenerationResponse, UsageRead
from app.services.ai.service import AIService
from app.services.usage_service import UsageService

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post(
    "/generate",
    response_model=GenerationResponse,
    summary="Gerar conteúdo com IA (consome 1 geração; regenerar = nova chamada)",
)
def generate_content(
    payload: ContentGenerateRequest, user: User = Depends(get_current_user), service: AIService = Depends(get_ai_service)
):
    return service.generate_content(user, payload)


@router.post(
    "/generate-campaign",
    response_model=GenerationResponse,
    summary="Gerar estrutura de campanha com IA (consome 1 geração)",
)
def generate_campaign(
    payload: CampaignGenerateRequest, user: User = Depends(get_current_user), service: AIService = Depends(get_ai_service)
):
    return service.generate_campaign(user, payload)


@router.get("/usage", response_model=UsageRead, summary="Consumo diário de gerações do usuário")
def get_usage(user: User = Depends(get_current_user), usage: UsageService = Depends(get_usage_service)):
    return usage.snapshot(user.id)
