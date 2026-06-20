"""
Heavenly Nature School Management System - Main Application
Production-ready FastAPI application for Render deployment
"""
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from datetime import datetime
import logging
import time
import sys
import os

from app.core.config import settings
from app.core.database import (
    connect_to_mongo,
    close_mongo_connection,
    check_database_health,
    get_connection_status
)
from app.api.v1 import (
    auth, users, students, teachers, classes,
    attendance, exams, financial, reports, school
)

# =========================================================================
# LOGGING CONFIGURATION
# =========================================================================
logging_config = {
    "level": getattr(logging, settings.LOG_LEVEL),
    "format": settings.LOG_FORMAT,
    "handlers": [logging.StreamHandler(sys.stdout)]
}

if settings.LOG_FILE:
    log_dir = os.path.dirname(settings.LOG_FILE)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)
    logging_config["handlers"].append(logging.FileHandler(settings.LOG_FILE))

logging.basicConfig(**logging_config)
logger = logging.getLogger(__name__)

logging.getLogger("motor").setLevel(logging.WARNING)
logging.getLogger("pymongo").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)


# =========================================================================
# LIFESPAN
# =========================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Debug Mode: {settings.DEBUG}")
    logger.info("=" * 60)

    startup_start = time.time()

    try:
        logger.info("📦 Connecting to MongoDB...")
        connected = await connect_to_mongo()

        if connected:
            logger.info("✅ MongoDB connection established")
            await seed_default_data()
            await initialize_services()
        else:
            logger.warning("⚠️  Starting in API-only mode (no database)")

    except Exception as e:
        logger.warning(f"⚠️  MongoDB not available: {e}")
        logger.warning("⚠️  Starting in API-only mode (no database)")

    logger.info(f"✅ Application startup complete ({time.time() - startup_start:.2f}s)")
    logger.info(f"📡 API base URL: {settings.API_V1_PREFIX}")
    logger.info(f"📚 API Documentation: /docs")

    yield

    logger.info("🛑 Shutting down application...")
    try:
        await close_mongo_connection()
        logger.info("✅ MongoDB connection closed")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

    logger.info("👋 Application shutdown complete")


# =========================================================================
# SEED DATA
# =========================================================================
async def seed_default_data():
    """Seed default school info + admin user"""
    from app.core.database import db

    if db is None:
        logger.warning("⚠️ Cannot seed data: database not connected")
        return

    try:
        from app.services.auth_service import create_initial_admin
        await create_initial_admin(db)

        school_info = await db.school_info.find_one({})
        if not school_info:
            await db.school_info.insert_one({
                "school_name": settings.SCHOOL_NAME,
                "motto": settings.SCHOOL_MOTTO,
                "vision": "To be a leading educational institution nurturing righteous leaders for tomorrow",
                "mission": "To provide quality education in a nurturing environment",
                "core_values": ["Excellence", "Integrity", "Compassion"],
                "contact_email": settings.SCHOOL_EMAIL,
                "contact_phone": settings.SCHOOL_PHONE,
                "address": {
                    "city": "Juba",
                    "state": "Central Equatoria",
                    "country": "South Sudan"
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            logger.info("✅ Default school info created")
        else:
            logger.info("ℹ️ School info already exists")

        from app.models.school import SchoolModel
        from app.models.class_model import ClassModel

        academic_year = SchoolModel._get_current_academic_year()
        await ClassModel.initialize_class_levels(db, academic_year)

        logger.info(f"✅ Class levels initialized for {academic_year}")

    except Exception as e:
        logger.error(f"❌ Error seeding default data: {e}")


# =========================================================================
# SERVICES
# =========================================================================
async def initialize_services():
    from app.core.database import db

    if db is None:
        return

    try:
        now = datetime.utcnow()

        await db.teacher_leaves.update_many(
            {"status": "approved", "end_date": {"$lt": now}},
            {"$set": {"status": "completed", "updated_at": now}}
        )

        await db.users.update_many(
            {"reset_token_expires": {"$lt": now}},
            {"$unset": {"reset_token": "", "reset_token_expires": ""}}
        )

        logger.info("✅ Services initialized")

    except Exception as e:
        logger.warning(f"⚠️ Service initialization: {e}")


# =========================================================================
# APP
# =========================================================================
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# =========================================================================
# MIDDLEWARE
# =========================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


# =========================================================================
# REQUEST MIDDLEWARE
# =========================================================================
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    import uuid

    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id

    start = time.time()

    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{time.time() - start:.3f}s"
        return response

    except Exception as e:
        logger.error(f"❌ Request failed [{request_id}]: {e}", exc_info=True)

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error",
                "request_id": request_id
            }
        )


# =========================================================================
# EXCEPTION HANDLERS
# =========================================================================
@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "errors": exc.errors()
        }
    )


@app.exception_handler(HTTPException)
async def http_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail}
    )


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Unexpected error"}
    )


# =========================================================================
# ROUTES
# =========================================================================
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users")
app.include_router(students.router, prefix=f"{settings.API_V1_PREFIX}/students")
app.include_router(teachers.router, prefix=f"{settings.API_V1_PREFIX}/teachers")
app.include_router(classes.router, prefix=f"{settings.API_V1_PREFIX}/classes")
app.include_router(attendance.router, prefix=f"{settings.API_V1_PREFIX}/attendance")
app.include_router(exams.router, prefix=f"{settings.API_V1_PREFIX}/exams")
app.include_router(financial.router, prefix=f"{settings.API_V1_PREFIX}/financial")
app.include_router(reports.router, prefix=f"{settings.API_V1_PREFIX}/reports")
app.include_router(school.router, prefix=f"{settings.API_V1_PREFIX}/school")


# =========================================================================
# ROOT
# =========================================================================
@app.get("/")
async def root():
    return {
        "success": True,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "database": await check_database_health(),
        "timestamp": datetime.utcnow().isoformat()
    }
