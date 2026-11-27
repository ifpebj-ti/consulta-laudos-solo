import asyncio

import pytest

from src.core.config import settings
from src.core.database import Base, async_engine
from src.core.init_db import init_db
from src.core.limiter import limiter

TEST_POWERUSER_PASS = "senha-teste-poweruser-123"


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Limpa contadores de rate limit entre testes para evitar 429 falso-positivo na suíte."""
    limiter.reset()
    yield


@pytest.fixture(scope="session", autouse=True)
def initialize_database():
    """Garante recriação limpa do schema e seed das amostras para os testes."""
    settings.POWERUSER_PASSWORD = TEST_POWERUSER_PASS

    async def _reset_db():
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        await init_db()

    asyncio.run(_reset_db())
