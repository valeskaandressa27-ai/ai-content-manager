from fastapi import APIRouter, Depends, Response, status

from app.dependencies.auth import get_current_user
from app.dependencies.services import get_user_service
from app.models import User
from app.schemas.user import PasswordChange, UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead, summary="Ver perfil")
def get_profile(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserRead, summary="Atualizar nome do perfil")
def update_profile(
    payload: UserUpdate, user: User = Depends(get_current_user), service: UserService = Depends(get_user_service)
):
    return service.update_profile(user, payload)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT, summary="Alterar senha")
def change_password(
    payload: PasswordChange, user: User = Depends(get_current_user), service: UserService = Depends(get_user_service)
):
    service.change_password(user, payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
