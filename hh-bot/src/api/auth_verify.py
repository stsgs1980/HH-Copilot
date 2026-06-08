"""Auth verification endpoint for NextAuth.js credentials provider."""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from src.db.database import async_session_factory

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class VerifyCredentialsRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyCredentialsResponse(BaseModel):
    id: int
    email: str
    name: str | None = None


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class ChangePasswordRequest(BaseModel):
    email: EmailStr
    old_password: str
    new_password: str


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    import bcrypt
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    import bcrypt
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


@router.post("/verify", response_model=VerifyCredentialsResponse)
async def verify_credentials(request: VerifyCredentialsRequest):
    """Verify email/password credentials for NextAuth.js."""
    from src.db.models import User

    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.email == request.email)
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.warning("Login attempt for non-existent email: %s", request.email)
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not user.password_hash:
            logger.warning("User %s has no password set", request.email)
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(request.password, user.password_hash):
            logger.warning("Invalid password for user %s", request.email)
            raise HTTPException(status_code=401, detail="Invalid credentials")

        logger.info("User %s authenticated successfully", request.email)
        return VerifyCredentialsResponse(
            id=user.id,
            email=user.email,
            name=user.name,
        )


@router.post("/create-user", response_model=VerifyCredentialsResponse)
async def create_user(request: CreateUserRequest):
    """Create a new user with email/password. Used by admin or registration."""
    from src.db.models import User, UserSettings

    async with async_session_factory() as session:
        # Check if email already exists
        result = await session.execute(
            select(User).where(User.email == request.email)
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user
        user = User(
            email=request.email,
            password_hash=hash_password(request.password),
            name=request.name or request.email.split("@")[0],
        )
        session.add(user)
        await session.flush()

        # Create default settings
        settings = UserSettings(user_id=user.id)
        session.add(settings)

        await session.commit()
        logger.info("Created new user: %s", request.email)

        return VerifyCredentialsResponse(
            id=user.id,
            email=user.email,
            name=user.name,
        )


@router.post("/change-password")
async def change_password(request: ChangePasswordRequest):
    """Change user password."""
    from src.db.models import User

    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.email == request.email)
        )
        user = result.scalar_one_or_none()

        if not user or not user.password_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(request.old_password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid old password")

        user.password_hash = hash_password(request.new_password)
        await session.commit()
        logger.info("Password changed for user %s", request.email)

        return {"status": "ok"}


@router.get("/users")
async def list_users():
    """List all users (admin only in production)."""
    from src.db.models import User

    async with async_session_factory() as session:
        result = await session.execute(
            select(User.id, User.email, User.name, User.created_at)
        )
        users = result.fetchall()
        return [
            {"id": u.id, "email": u.email, "name": u.name}
            for u in users
        ]
