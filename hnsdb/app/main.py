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

# Add file handler if log file specified
if settings.LOG_FILE:
    log_dir = os.path.dirname(settings.LOG_FILE)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)
    logging_config["handlers"].append(logging.FileHandler(settings.LOG_FILE))

logging.basicConfig(**logging_config)
logger = logging.getLogger(__name__)

# Suppress noisy third-party loggers
logging.getLogger("motor").setLevel(logging.WARNING)
logging.getLogger("pymongo").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)


# =========================================================================
# APPLICATION LIFECYCLE
# =========================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events"""
    logger.info("=" * 60)
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Debug Mode: {settings.DEBUG}")
    logger.info("=" * 60)

    # Startup
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

    startup_time = time.time() - startup_start
    logger.info(f"✅ Application startup complete ({startup_time:.2f}s)")
    logger.info(f"📡 API base URL: {settings.API_V1_PREFIX}")
    logger.info(f"📚 API Documentation: /docs")

    yield

    # Shutdown
    logger.info("🛑 Shutting down application...")
    try:
        await close_mongo_connection()
        logger.info("✅ MongoDB connection closed")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

    logger.info("👋 Application shutdown complete")


async def seed_default_data():
    """Seed default school information and admin user"""
    from app.core.database import db

    if db is None:
        logger.warning("⚠️  Cannot seed data: database not connected")
        return

    try:
        # Create initial admin user
        from app.services.auth_service import create_initial_admin
        await create_initial_admin(db)

        # Ensure school info exists
        school_info = await db.school_info.find_one({})
        if not school_info:
            await db.school_info.insert_one({
                "school_name": settings.SCHOOL_NAME,
                "motto": settings.SCHOOL_MOTTO,
                "vision": "To be a leading educational institution nurturing righteous leaders for tomorrow",
                "mission": "To provide quality education in a nurturing environment that develops academic excellence, moral values, and leadership skills",
                "core_values": ["Excellence", "Integrity", "Compassion", "Discipline", "Service"],
                "contact_email": settings.SCHOOL_EMAIL,
                "contact_phone": settings.SCHOOL_PHONE,
                "address": {
                    "city": "Juba",
                    "state": "Central Equatoria",
                    "country": "South Sudan"
                },
                "logo_url": None,
                "logo_thumbnail_url": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            logger.info("✅ Default school info created")
        else:
            logger.info("ℹ️  School info already exists")

        # Initialize class levels
        from app.models.class_model import ClassModel
        from app.models.school import SchoolModel
        academic_year = SchoolModel._get_current_academic_year()
        await ClassModel.initialize_class_levels(db, academic_year)
        logger.info(f"✅ Class levels initialized for {academic_year}")

    except Exception as e:
        logger.error(f"❌ Error seeding default data: {e}")


async def initialize_services():
    """Initialize background services and scheduled tasks"""
    from app.core.database import db

    if db is None:
        return

    try:
        today = datetime.utcnow()
        # Check for overdue leave returns
        result = await db.teacher_leaves.update_many(
            {"status": "approved", "end_date": {"$lt": today}},
            {"$set": {"status": "completed", "updated_at": today}}
        )
        if result.modified_count > 0:
            logger.info(f"✅ Updated {result.modified_count} completed leaves")

        # Clean expired tokens
        result = await db.users.update_many(
            {"reset_token_expires": {"$lt": today}},
            {"$unset": {"reset_token": "", "reset_token_expires": ""}}
        )
        if result.modified_count > 0:
            logger.info(f"✅ Cleaned {result.modified_count} expired reset tokens")

        logger.info("✅ Services initialized")
    except Exception as e:
        logger.warning(f"⚠️  Service initialization: {e}")


# =========================================================================
# APPLICATION INSTANCE
# =========================================================================
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Heavenly Nature School Administration",
        "email": settings.SCHOOL_EMAIL,
    },
    license_info={
        "name": "Proprietary",
    },
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1,
        "docExpansion": "list",
        "filter": True,
        "tagsSorter": "alpha",
    }
)


# =========================================================================
# MIDDLEWARE
# =========================================================================
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time"],
    max_age=600
)

# GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# =========================================================================
# CUSTOM MIDDLEWARE
# =========================================================================
@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    """Add request ID and response time headers"""
    import uuid

    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    start_time = time.time()

    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{(time.time() - start_time):.3f}s"

        if settings.is_development:
            logger.info(
                f"📡 {request.method} {request.url.path} "
                f"- {response.status_code} "
                f"({(time.time() - start_time):.3f}s) "
                f"[{request_id}]"
            )
        return response

    except Exception as e:
        logger.error(f"❌ Request failed [{request_id}]: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })

    logger.warning(f"Validation error: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "message": "Validation error", "errors": errors}
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "status_code": exc.status_code
        },
        headers=getattr(exc, "headers", None)
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"❌ Unhandled error [{request_id}]: {exc}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An unexpected error occurred" if settings.is_production else str(exc),
            "request_id": request_id
        }
    )


# =========================================================================
# API ROUTERS
# =========================================================================
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["🔐 Authentication"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["👥 Users"])
app.include_router(students.router, prefix=f"{settings.API_V1_PREFIX}/students", tags=["🎓 Students"])
app.include_router(teachers.router, prefix=f"{settings.API_V1_PREFIX}/teachers", tags=["👨‍🏫 Teachers"])
app.include_router(classes.router, prefix=f"{settings.API_V1_PREFIX}/classes", tags=["🏫 Classes"])
app.include_router(attendance.router, prefix=f"{settings.API_V1_PREFIX}/attendance", tags=["📋 Attendance"])
app.include_router(exams.router, prefix=f"{settings.API_V1_PREFIX}/exams", tags=["📝 Exams"])
app.include_router(financial.router, prefix=f"{settings.API_V1_PREFIX}/financial", tags=["💰 Financial"])
app.include_router(reports.router, prefix=f"{settings.API_V1_PREFIX}/reports", tags=["📊 Reports"])
app.include_router(school.router, prefix=f"{settings.API_V1_PREFIX}/school", tags=["🏛️ School"])


# =========================================================================
# ROOT ENDPOINTS
# =========================================================================
@app.get("/", tags=["System"])
async def root():
    """API root endpoint"""
    return {
        "success": True,
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
        "documentation": "/docs",
        "health_check": "/health",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint for monitoring"""
    health_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "application": {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
        },
        "database": {"status": "disconnected"}
    }

    try:
        db_health = await check_database_health()
        health_data["database"] = db_health
    except Exception as e:
        health_data["database"] = {"status": "error", "error": str(e)}
        health_data["status"] = "degraded"

    return health_data