"""FastAPI application - REST API bridge between Next.js dashboard and Python backend."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.resumes import router as resumes_router
from src.api.vacancies import router as vacancies_router
from src.api.negotiations import router as negotiations_router
from src.api.stats import router as stats_router
from src.api.bot_status import router as bot_status_router
from src.api.settings import router as settings_router
from src.api.auth import router as auth_router
from src.api.auth_verify import router as auth_verify_router
from src.db.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    try:
        logger.info("Initializing database...")
        await init_db()
        logger.info("Database initialized.")
    except Exception as e:
        logger.error("Database init failed: %s", e)
    # Create default admin user if no users exist
    try:
        from src.db.database import async_session_factory
        from src.db.models import User
        from sqlalchemy import select, func
        async with async_session_factory() as session:
            result = await session.execute(select(func.count(User.id)))
            count = result.scalar() or 0
            if count == 0:
                import bcrypt
                default_password = "admin123"
                password_hash = bcrypt.hashpw(default_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                admin = User(
                    email="admin@hhbot.example.com",
                    password_hash=password_hash,
                    name="Admin",
                )
                session.add(admin)
                await session.commit()
                logger.info("Created default admin user: admin@hhbot.example.com / admin123")
    except Exception as e:
        logger.error("Admin user creation failed: %s", e)
    logger.info("FastAPI server ready!")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="HH Bot API",
    description="REST API for HH.ru job automation bot dashboard",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resumes_router, prefix="/api")
app.include_router(vacancies_router, prefix="/api")
app.include_router(negotiations_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(bot_status_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(auth_verify_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "hh-bot-api"}
