from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


def _build_engine():
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required for database access.")
    return create_engine(settings.database_url, pool_pre_ping=True)


engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def get_session_factory() -> sessionmaker[Session]:
    global engine, SessionLocal

    if SessionLocal is None:
        engine = _build_engine()
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    return SessionLocal


def set_session_factory(session_factory: sessionmaker[Session]) -> None:
    """Install a session factory, mainly for tests."""
    global SessionLocal, engine
    SessionLocal = session_factory
    engine = session_factory.kw.get("bind")


def reset_session_factory() -> None:
    global SessionLocal, engine
    SessionLocal = None
    engine = None


def get_db_session() -> Generator[Session, None, None]:
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()
