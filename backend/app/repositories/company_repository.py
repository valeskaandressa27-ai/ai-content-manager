from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Company


class CompanyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_user(self, user_id: int) -> Company | None:
        return self.db.scalar(select(Company).where(Company.user_id == user_id))

    def add(self, company: Company) -> Company:
        self.db.add(company)
        self.db.commit()
        return company

    def save(self, company: Company) -> Company:
        self.db.commit()
        return company
