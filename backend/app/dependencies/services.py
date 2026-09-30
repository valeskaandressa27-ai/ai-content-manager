"""Fábricas de serviços usadas via Depends (facilitam override nos testes)."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.database.session import get_db
from app.dependencies.settings import get_app_settings
from app.repositories.ai_generation_repository import AIGenerationRepository
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.company_repository import CompanyRepository
from app.repositories.content_repository import ContentRepository
from app.repositories.user_repository import UserRepository
from app.services.ai.provider import AIProvider, build_provider
from app.services.ai.service import AIService
from app.services.auth_service import AuthService
from app.services.campaign_service import CampaignService
from app.services.company_service import CompanyService
from app.services.content_service import ContentService
from app.services.dashboard_service import DashboardService
from app.services.usage_service import UsageService
from app.services.user_service import UserService


def get_auth_service(db: Session = Depends(get_db), settings: Settings = Depends(get_app_settings)) -> AuthService:
    return AuthService(UserRepository(db), settings)


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(UserRepository(db))


def get_company_service(db: Session = Depends(get_db)) -> CompanyService:
    return CompanyService(CompanyRepository(db))


def get_content_service(db: Session = Depends(get_db)) -> ContentService:
    return ContentService(ContentRepository(db), AIGenerationRepository(db))


def get_campaign_service(db: Session = Depends(get_db)) -> CampaignService:
    return CampaignService(CampaignRepository(db))


def get_usage_service(db: Session = Depends(get_db), settings: Settings = Depends(get_app_settings)) -> UsageService:
    return UsageService(AIGenerationRepository(db), settings)


def get_ai_provider(settings: Settings = Depends(get_app_settings)) -> AIProvider:
    return build_provider(settings)


def get_ai_service(
    db: Session = Depends(get_db),
    provider: AIProvider = Depends(get_ai_provider),
    usage: UsageService = Depends(get_usage_service),
) -> AIService:
    return AIService(provider, usage, CompanyRepository(db))


def get_dashboard_service(
    db: Session = Depends(get_db), usage: UsageService = Depends(get_usage_service)
) -> DashboardService:
    return DashboardService(ContentRepository(db), CampaignRepository(db), AIGenerationRepository(db), usage)
