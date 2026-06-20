"""
Authentication Service - Minimal
"""
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.core.security import get_password_hash
from app.core.config import settings

logger = logging.getLogger(__name__)


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
        logger.info(f"✅ Admin user created: {settings.ADMIN_EMAIL}")
    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")
