"""SQLAlchemy database setup and session management."""

import os
from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# Determine database URL — prefer HH_BOT_DATABASE_URL, then settings, then hardcoded default
_db_url = os.environ.get("HH_BOT_DATABASE_URL") or os.environ.get("database_url") or "sqlite+aiosqlite:///./data/hh_bot.db"
# If DATABASE_URL from Prisma leaks in, ignore it
if _db_url.startswith("file:"):
    _db_url = "sqlite+aiosqlite:///./data/hh_bot.db"

engine = create_async_engine(
    _db_url,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False},  # SQLite: allow cross-thread usage
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)


# Enable WAL mode for better concurrent access with SQLite
@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables (use Alembic in production)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
