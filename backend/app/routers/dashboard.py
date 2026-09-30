from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.dependencies.services import get_dashboard_service
from app.models import User
from app.schemas.dashboard import DashboardRead
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardRead, summary="Indicadores reais do usuário")
def get_dashboard(user: User = Depends(get_current_user), service: DashboardService = Depends(get_dashboard_service)):
    return service.build(user)
