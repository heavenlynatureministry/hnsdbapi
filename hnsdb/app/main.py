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
import uuid

from app.core.config import settings
from app.core.database import (
    connect_to_mongo,
    close_mongo_connection,
    check_database_health,
    get_connection_status,
    get_database
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

# Suppress noisy third-party logs
logging.getLogger("motor").setLevel(logging.WARNING)
logging.getLogger("pymongo").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)


# =========================================================================
# LIFESPAN (Application Lifecycle)
# =========================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler
    Handles startup and shutdown events
    """
    # ===== STARTUP =====
    logger.info("=" * 60)
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Debug Mode: {settings.DEBUG}")
    logger.info(f"   API Prefix: {settings.API_V1_PREFIX}")
    logger.info("=" * 60)

    startup_start = time.time()

    # Connect to MongoDB
    try:
        logger.info("📦 Connecting to MongoDB...")
        connected = await connect_to_mongo()

        if connected:
            logger.info("✅ MongoDB connection established")
            
            # Seed default data and initialize services
            await seed_default_data()
            await initialize_services()
        else:
            logger.warning("⚠️  Starting in API-only mode (no database)")

    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        logger.warning("⚠️  Starting in API-only mode (no database)")

    # Log startup summary
    startup_time = time.time() - startup_start
    logger.info(f"✅ Application startup complete ({startup_time:.2f}s)")
    logger.info(f"📡 API Base URL: {settings.API_V1_PREFIX}")
    logger.info(f"📚 API Documentation: /docs")
    logger.info(f"🔍 Health Check: /health")
    logger.info("=" * 60)

    yield  # Application runs here

    # ===== SHUTDOWN =====
    logger.info("🛑 Shutting down application...")
    
    try:
        await close_mongo_connection()
        logger.info("✅ MongoDB connection closed")
    except Exception as e:
        logger.error(f"❌ Error closing MongoDB: {e}")

    logger.info("👋 Application shutdown complete")


# =========================================================================
# SEED DEFAULT DATA
# =========================================================================
async def seed_default_data():
    """
    Seed default school information and admin user
    Only runs if database is connected
    """
    db = get_database()
    
    if db is None:
        logger.warning("⚠️  Cannot seed data: database not connected")
        return

    try:
        # Create admin user if not exists
        from app.services.auth_service import create_initial_admin
        await create_initial_admin(db)

        # Create school info if not exists
        school_info = await db.school_info.find_one({})
        if not school_info:
            await db.school_info.insert_one({
                "school_name": settings.SCHOOL_NAME,
                "short_name": settings.SCHOOL_SHORT_NAME,
                "motto": settings.SCHOOL_MOTTO,
                "logo_url": "/logo.png",
                "letterhead_url": "/letter-head.jpg",
                "vision": "To be a leading educational institution nurturing righteous leaders for tomorrow",
                "mission": "To provide quality education in a nurturing environment that develops the whole child",
                "core_values": [
                    "Excellence",
                    "Integrity",
                    "Compassion",
                    "Respect",
                    "Responsibility"
                ],
                "contact_email": settings.SCHOOL_EMAIL,
                "contact_phone": settings.SCHOOL_PHONE,
                "address": {
                    "street": settings.SCHOOL_ADDRESS,
                    "city": "Juba",
                    "state": "Central Equatoria",
                    "country": "South Sudan"
                },
                "website": settings.SCHOOL_WEBSITE,
                "academic_settings": {
                    "terms_per_year": settings.TERMS_PER_YEAR,
                    "pass_mark_percentage": settings.PASS_MARK_PERCENTAGE,
                    "max_students_per_class": settings.MAX_STUDENTS_PER_CLASS
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            logger.info("✅ Default school info created")
        else:
            # Update existing school info with logo_url and letterhead_url if missing
            updates = {}
            if not school_info.get("logo_url"):
                updates["logo_url"] = "/logo.png"
            if not school_info.get("letterhead_url"):
                updates["letterhead_url"] = "/letter-head.jpg"
            if updates:
                await db.school_info.update_one(
                    {"_id": school_info["_id"]},
                    {"$set": updates}
                )
                logger.info("✅ Logo and letterhead URLs added to existing school info")
            logger.info("ℹ️  School info already exists")

        # Initialize class levels for current academic year
        from app.models.school import SchoolModel
        from app.models.class_model import ClassModel

        academic_year = SchoolModel._get_current_academic_year()
        await ClassModel.initialize_class_levels(db, academic_year)
        logger.info(f"✅ Class levels initialized for {academic_year}")

    except Exception as e:
        logger.error(f"❌ Error seeding default data: {e}")
        if settings.is_development:
            logger.exception("Detailed traceback:")


# =========================================================================
# INITIALIZE SERVICES
# =========================================================================
async def initialize_services():
    """
    Initialize and clean up services on startup
    """
    db = get_database()
    
    if db is None:
        return

    try:
        now = datetime.utcnow()

        # Mark expired leaves as completed
        result = await db.teacher_leaves.update_many(
            {
                "status": "approved",
                "end_date": {"$lt": now}
            },
            {
                "$set": {
                    "status": "completed",
                    "updated_at": now
                }
            }
        )
        if result.modified_count > 0:
            logger.info(f"✅ Marked {result.modified_count} leaves as completed")

        # Clean up expired password reset tokens
        result = await db.users.update_many(
            {
                "reset_token_expires": {"$lt": now}
            },
            {
                "$unset": {
                    "reset_token": "",
                    "reset_token_expires": ""
                }
            }
        )
        if result.modified_count > 0:
            logger.info(f"✅ Cleaned {result.modified_count} expired reset tokens")

        logger.info("✅ Services initialized successfully")

    except Exception as e:
        logger.warning(f"⚠️  Service initialization warning: {e}")


# =========================================================================
# CREATE FASTAPI APPLICATION
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
        "name": settings.SCHOOL_NAME,
        "email": settings.SCHOOL_EMAIL,
        "url": settings.SCHOOL_WEBSITE
    },
    license_info={
        "name": "Proprietary",
        "url": settings.SCHOOL_WEBSITE
    },
    redirect_slashes=False
)


# =========================================================================
# MIDDLEWARE CONFIGURATION
# =========================================================================

# CORS Middleware (Production configured)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time"],
    max_age=3600
)

# GZip Compression Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)


# =========================================================================
# CUSTOM REQUEST MIDDLEWARE
# =========================================================================
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """
    Custom middleware for request tracking and logging
    """
    # Generate unique request ID
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    
    # Track request start time
    start_time = time.time()
    
    # Log incoming request
    logger.info(
        f"📥 [{request_id}] {request.method} {request.url.path} "
        f"from {request.client.host if request.client else 'unknown'}"
    )

    try:
        # Process request
        response = await call_next(request)
        
        # Add custom headers
        process_time = time.time() - start_time
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{process_time:.3f}s"
        
        # Log response
        logger.info(
            f"📤 [{request_id}] {response.status_code} "
            f"({process_time:.3f}s)"
        )
        
        return response

    except Exception as e:
        # Log error
        logger.error(
            f"❌ [{request_id}] Request failed: {e}",
            exc_info=True
        )
        
        # Create error response with CORS headers
        origin = request.headers.get("origin", "")
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "Internal server error",
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        # Add CORS headers manually for 500 errors
        if origin in settings.ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response


# =========================================================================
# EXCEPTION HANDLERS
# =========================================================================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle request validation errors
    """
    logger.warning(
        f"⚠️  [{getattr(request.state, 'request_id', 'unknown')}] "
        f"Validation error: {exc.errors()}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error",
            "errors": exc.errors(),
            "request_id": getattr(request.state, 'request_id', None)
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handle HTTP exceptions
    """
    logger.warning(
        f"⚠️  [{getattr(request.state, 'request_id', 'unknown')}] "
        f"HTTP {exc.status_code}: {exc.detail}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "request_id": getattr(request.state, 'request_id', None)
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Handle all unhandled exceptions with CORS headers
    """
    logger.error(
        f"❌ [{getattr(request.state, 'request_id', 'unknown')}] "
        f"Unhandled error: {exc}",
        exc_info=True
    )
    
    # Don't expose internal errors in production
    error_message = "Internal server error"
    if settings.is_development or settings.DEBUG:
        error_message = str(exc)
    
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": error_message,
            "request_id": getattr(request.state, 'request_id', None),
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    # Add CORS headers so frontend can read the error
    origin = request.headers.get("origin", "")
    if origin in settings.ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response


# =========================================================================
# API ROUTES (No trailing slashes)
# =========================================================================
API_PREFIX = settings.API_V1_PREFIX

# Authentication routes
app.include_router(
    auth.router,
    prefix=f"{API_PREFIX}/auth",
    tags=["Authentication"]
)

# User management routes
app.include_router(
    users.router,
    prefix=f"{API_PREFIX}/users",
    tags=["Users"]
)

# Student management routes
app.include_router(
    students.router,
    prefix=f"{API_PREFIX}/students",
    tags=["Students"]
)

# Teacher management routes
app.include_router(
    teachers.router,
    prefix=f"{API_PREFIX}/teachers",
    tags=["Teachers"]
)

# Class management routes
app.include_router(
    classes.router,
    prefix=f"{API_PREFIX}/classes",
    tags=["Classes"]
)

# Attendance routes
app.include_router(
    attendance.router,
    prefix=f"{API_PREFIX}/attendance",
    tags=["Attendance"]
)

# Examination routes
app.include_router(
    exams.router,
    prefix=f"{API_PREFIX}/exams",
    tags=["Examinations"]
)

# Financial management routes
app.include_router(
    financial.router,
    prefix=f"{API_PREFIX}/financial",
    tags=["Finance"]
)

# Reporting routes
app.include_router(
    reports.router,
    prefix=f"{API_PREFIX}/reports",
    tags=["Reports"]
)

# School information routes
app.include_router(
    school.router,
    prefix=f"{API_PREFIX}/school",
    tags=["School"]
)


# =========================================================================
# ROOT ENDPOINTS
# =========================================================================
@app.get("/")
async def root():
    """
    Root endpoint - API information
    """
    return {
        "success": True,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "api_prefix": settings.API_V1_PREFIX
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    Returns application and database health status
    """
    db_health = await check_database_health()
    
    return {
        "success": True,
        "status": "healthy" if db_health.get("status") == "healthy" else "degraded",
        "database": db_health,
        "connection": get_connection_status(),
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": "available"
    }


@app.get("/api")
async def api_info():
    """
    API information endpoint
    """
    return {
        "success": True,
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "api_version": "v1",
        "base_url": settings.API_V1_PREFIX,
        "documentation": "/docs",
        "endpoints": {
            "auth": f"{settings.API_V1_PREFIX}/auth",
            "users": f"{settings.API_V1_PREFIX}/users",
            "students": f"{settings.API_V1_PREFIX}/students",
            "teachers": f"{settings.API_V1_PREFIX}/teachers",
            "classes": f"{settings.API_V1_PREFIX}/classes",
            "attendance": f"{settings.API_V1_PREFIX}/attendance",
            "exams": f"{settings.API_V1_PREFIX}/exams",
            "financial": f"{settings.API_V1_PREFIX}/financial",
            "reports": f"{settings.API_V1_PREFIX}/reports",
            "school": f"{settings.API_V1_PREFIX}/school"
        }
    }


# =========================================================================
# APPLICATION ENTRY POINT
# =========================================================================
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=settings.is_development,
        log_level=settings.LOG_LEVEL.lower(),
        workers=1
    )



update the main with offline capability 
# Add this import
from app.api.v1.endpoints import sync

# Add this to your app initialization
app.include_router(
    sync.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["Sync"]
)
