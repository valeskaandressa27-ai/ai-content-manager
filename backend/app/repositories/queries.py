from sqlalchemy import ColumnElement, or_


def like_pattern(term: str) -> str:
    """Escapa curingas do LIKE para que a busca seja por texto literal."""
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def ilike_any(term: str, *columns) -> ColumnElement[bool]:
    pattern = like_pattern(term)
    return or_(*(column.ilike(pattern, escape="\\") for column in columns))
