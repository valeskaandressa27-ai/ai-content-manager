from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.dependencies.services import get_company_service
from app.models import User
from app.schemas.company import CompanyRead, CompanyUpsert
from app.services.company_service import CompanyService

router = APIRouter(prefix="/company", tags=["Company"])


@router.get("", response_model=CompanyRead | None, summary="Perfil da empresa (null se ainda não cadastrado)")
def get_company(user: User = Depends(get_current_user), service: CompanyService = Depends(get_company_service)):
    return service.get(user)


@router.put("", response_model=CompanyRead, summary="Criar ou atualizar o perfil da empresa")
def save_company(
    payload: CompanyUpsert,
    user: User = Depends(get_current_user),
    service: CompanyService = Depends(get_company_service),
):
    return service.upsert(user, payload)
