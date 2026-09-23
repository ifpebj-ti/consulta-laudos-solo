import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


# Configura a engine assíncrona
engine_kwargs = {"future": True, "echo": False}
if "sqlite" in settings.DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

async_engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection para sessões assíncronas do banco de dados."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
