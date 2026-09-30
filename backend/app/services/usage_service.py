"""Controle do limite diário de gerações de IA (sempre calculado no backend, por usuário)."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.core.config import Settings
from app.core.errors import AILimitReachedError
from app.models import AIGeneration
from app.models.enums import GenerationStatus
from app.repositories.ai_generation_repository import AIGenerationRepository
from app.schemas.ai import UsageRead
from app.schemas.dashboard import DailyUsage


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


class UsageService:
    def __init__(self, repo: AIGenerationRepository, settings: Settings) -> None:
        self.repo = repo
        self.limit = settings.ai_daily_generation_limit
        self.tz = ZoneInfo(settings.usage_timezone)

    def _day_window(self, now: datetime | None = None) -> tuple[datetime, datetime]:
        """Início e fim (UTC) do dia atual no fuso configurado em USAGE_TIMEZONE."""
        local_now = (now or datetime.now(timezone.utc)).astimezone(self.tz)
        start = datetime.combine(local_now.date(), datetime.min.time(), tzinfo=self.tz)
        end = datetime.combine(local_now.date() + timedelta(days=1), datetime.min.time(), tzinfo=self.tz)
        return start.astimezone(timezone.utc), end.astimezone(timezone.utc)

    def snapshot(self, user_id: int) -> UsageRead:
        start, end = self._day_window()
        used = self.repo.count_counted_between(user_id, start, end)
        return UsageRead(used_today=used, limit=self.limit, remaining=max(self.limit - used, 0), resets_at=end)

    def reserve(self, user_id: int, generation_type: str) -> AIGeneration:
        """Verifica o limite e reserva uma vaga de forma atômica antes de chamar o provedor."""
        self.repo.lock_user(user_id)
        start, end = self._day_window()
        used = self.repo.count_counted_between(user_id, start, end)
        if used >= self.limit:
            self.repo.rollback()  # libera o lock
            raise AILimitReachedError(
                f"Limite diário de {self.limit} gerações atingido. O limite é renovado à meia-noite."
            )
        generation = AIGeneration(
            user_id=user_id, generation_type=generation_type, status=GenerationStatus.pending.value
        )
        return self.repo.add(generation)

    def mark_success(self, generation: AIGeneration) -> None:
        generation.status = GenerationStatus.success.value
        self.repo.save(generation)

    def mark_failed(self, generation: AIGeneration) -> None:
        """Falhas do provedor não consomem o limite do usuário."""
        generation.status = GenerationStatus.failed.value
        self.repo.save(generation)

    def daily_counts(self, user_id: int, days: int) -> list[DailyUsage]:
        today = datetime.now(timezone.utc).astimezone(self.tz).date()
        first_day = today - timedelta(days=days - 1)
        since = datetime.combine(first_day, datetime.min.time(), tzinfo=self.tz).astimezone(timezone.utc)

        counts: dict[date, int] = {first_day + timedelta(days=i): 0 for i in range(days)}
        for created_at in self.repo.created_at_since(user_id, since):
            local_day = _as_utc(created_at).astimezone(self.tz).date()
            if local_day in counts:
                counts[local_day] += 1
        return [DailyUsage(date=day, count=count) for day, count in counts.items()]
