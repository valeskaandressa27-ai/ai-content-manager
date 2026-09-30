from __future__ import annotations

from app.models import Company, User
from app.repositories.company_repository import CompanyRepository
from app.schemas.company import CompanyUpsert


class CompanyService:
    def __init__(self, companies: CompanyRepository) -> None:
        self.companies = companies

    def get(self, user: User) -> Company | None:
        return self.companies.get_by_user(user.id)

    def upsert(self, user: User, payload: CompanyUpsert) -> Company:
        data = payload.model_dump()
        company = self.companies.get_by_user(user.id)
        if company is None:
            return self.companies.add(Company(user_id=user.id, **data))
        for field, value in data.items():
            setattr(company, field, value)
        return self.companies.save(company)
