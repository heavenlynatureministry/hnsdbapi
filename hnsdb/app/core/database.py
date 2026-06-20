"""
Database Configuration - Production Ready
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional, Dict, Any
import logging
import asyncio

from app.core.config import settings

logger = logging.getLogger(__name__)

client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None
_is_connected: bool = False
_connection_attempts: int = 0


async def connect_to_mongo() -> bool:
    global client, db, _is_connected, _connection_attempts

    _connection_attempts += 1

    try:
        connection_kwargs = {
            "maxPoolSize": settings.MONGODB_MAX_POOL_SIZE,
            "minPoolSize": settings.MONGODB_MIN_POOL_SIZE,
            "serverSelectionTimeoutMS": 15000,
            "connectTimeoutMS": 15000,
            "retryWrites": True,
            "retryReads": True,
            "appName": f"HNS-{settings.APP_VERSION}",
        }

        if "mongodb+srv" in settings.MONGODB_URL:
            connection_kwargs["tls"] = True
            connection_kwargs["tlsAllowInvalidCertificates"] = settings.is_development

        logger.info("Connecting to MongoDB...")

        client = AsyncIOMotorClient(settings.MONGODB_URL, **connection_kwargs)

        await asyncio.wait_for(client.admin.command("ping"), timeout=20.0)

        db = client[settings.MONGODB_DB_NAME]

        # Create indexes
        try:
            await db.users.create_index("email", unique=True, sparse=True)
            await db.students.create_index("status")
            await db.teachers.create_index("email", unique=True, sparse=True)
            await db.classes.create_index([("class_name", 1), ("academic_year", 1)], unique=True)
            await db.attendance.create_index(
                [("student_id", 1), ("class_id", 1), ("date", 1)],
                unique=True
            )
            logger.info("✅ Database indexes created")
        except Exception as e:
            logger.warning(f"Index creation warning: {e}")

        _is_connected = True
        _connection_attempts = 0

        logger.info(f"✅ Connected to MongoDB: {settings.MONGODB_DB_NAME}")
        return True

    except Exception as e:
        _is_connected = False
        logger.error(f"❌ MongoDB connection failed: {e}")

        if client:
            client.close()
            client = None
            db = None

        if settings.is_development:
            logger.warning("⚠️ Starting in API-only mode")
            return False

        raise


async def close_mongo_connection():
    global client, _is_connected

    if client:
        client.close()
        client = None
        _is_connected = False
        logger.info("✅ MongoDB connection closed")


# 🔥 FIXED: REMOVE async (THIS WAS THE BUG)
def get_database() -> AsyncIOMotorDatabase:
    """
    FastAPI dependency - returns active database instance
    """
    global db, _is_connected

    if db is None or not _is_connected:
        raise Exception("Database not available. MongoDB not connected.")

    return db


async def check_database_health() -> Dict[str, Any]:
    if not _is_connected or db is None:
        return {"status": "disconnected", "is_connected": False}

    try:
        await db.command("ping")
        return {"status": "healthy", "is_connected": True}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def get_connection_status() -> Dict[str, Any]:
    return {
        "is_connected": _is_connected,
        "connection_attempts": _connection_attempts,
        "database_name": settings.MONGODB_DB_NAME if _is_connected else None,
    }
