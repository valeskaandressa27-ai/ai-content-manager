"""Orquestra geração: limite diário -> contexto -> provedor -> registro."""

from __future__ import annotations

import logging

from app.core.errors import AIProviderError
from app.models import Company, User
from app.repositories.company_repository import CompanyRepository
from app.schemas.ai import CampaignGenerateRequest, ContentGenerateRequest, GenerationResponse
from app.services.ai.prompts import SYSTEM_PROMPT, build_campaign_prompt, build_content_prompt
from app.services.ai.provider import AIProvider
from app.services.usage_service import UsageService
from app.models.enums import CAMPAIGN_GENERATION_TYPE

logger = logging.getLogger("app.ai")


class AIService:
    def __init__(self, provider: AIProvider, usage: UsageService, companies: CompanyRepository) -> None:
        self.provider = provider
        self.usage = usage
        self.companies = companies

    def generate_content(self, user: User, payload: ContentGenerateRequest) -> GenerationResponse:
        company = self._company_for(user, payload.use_company_context)
        prompt = build_content_prompt(payload, company)
        return self._run(user, payload.content_type.value, prompt)

    def generate_campaign(self, user: User, payload: CampaignGenerateRequest) -> GenerationResponse:
        company = self._company_for(user, payload.use_company_context)
        prompt = build_campaign_prompt(payload, company)
        return self._run(user, CAMPAIGN_GENERATION_TYPE, prompt)

    def _company_for(self, user: User, use_context: bool) -> Company | None:
        return self.companies.get_by_user(user.id) if use_context else None

    def _run(self, user: User, generation_type: str, user_prompt: str) -> GenerationResponse:
        generation = self.usage.reserve(user.id, generation_type)
        try:
            text = self.provider.generate(system_prompt=SYSTEM_PROMPT, user_prompt=user_prompt)
        except AIProviderError:
            self.usage.mark_failed(generation)
            raise
        except Exception as exc:  # qualquer falha inesperada do provedor vira erro controlado
            self.usage.mark_failed(generation)
            logger.exception("Erro inesperado no provedor de IA")
            raise AIProviderError() from exc

        self.usage.mark_success(generation)
        return GenerationResponse(
            generation_id=generation.id,
            generated_content=text,
            usage=self.usage.snapshot(user.id),
        )
