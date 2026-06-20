"""
Authentication Service - Simplified Production Version
"""
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.core.security import get_password_hash, verify_password
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service"""

    @staticmethod
    async def authenticate_user(
        db: AsyncIOMotorDatabase,
        email: str,
        password: str
    ) -> Optional[Dict[str, Any]]:
        """Authenticate user with email and password"""
        email = email.lower().strip()

        # Find user
        user = await db.users.find_one({"email": email})

        if not user:
            logger.warning(f"Login attempt for non-existent user: {email}")
            return None

        # Check if user is active
        if user.get("status") != "active":
            logger.warning(f"Inactive user login attempt: {email}")
            return None

        # Verify password
        if not verify_password(password, user.get("password_hash", "")):
            logger.warning(f"Failed password attempt for: {email}")
            return None

        # Update last login
        try:
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.utcnow(), "login_attempts": 0}}
            )
        except Exception as e:
            logger.warning(f"Failed to update last login: {e}")

        # Convert ObjectId to string
        user["_id"] = str(user["_id"])

        return user


async def create_initial_admin(db: AsyncIOMotorDatabase):
    """Create initial admin user if not exists"""
    existing_admin = await db.users.find_one({"role": "admin"})

    if existing_admin:
        logger.info("Admin user already exists")
        return

    admin_user = {
        "email": settings.ADMIN_EMAIL,
        "password_hash": get_password_hash(settings.ADMIN_PASSWORD),
        "first_name": settings.ADMIN_FIRST_NAME,
        "last_name": settings.ADMIN_LAST_NAME,
        "role": "admin",
        "status": "active",
        "permissions": ["*"],
        "login_attempts": 0,
        "password_changed_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    try:
        await db.users.insert_one(admin_user)
        logger.info(f"Admin user created: {settings.ADMIN_EMAIL}")
    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")
