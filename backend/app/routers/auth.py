from fastapi import APIRouter, Depends, status

from app.dependencies.auth import get_current_user
from app.dependencies.services import get_auth_service
from app.models import User
from app.schemas.user import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED, summary="Criar conta")
def register(payload: RegisterRequest, service: AuthService = Depends(get_auth_service)):
    return service.register(payload)


@router.post("/login", response_model=TokenResponse, summary="Login (retorna JWT)")
def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)):
    return service.login(payload)


@router.get("/me", response_model=UserRead, summary="Usuário autenticado")
def me(user: User = Depends(get_current_user)):
    return user
