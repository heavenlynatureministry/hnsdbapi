"""
Heavenly Nature School Management System - Main Application
Production-ready FastAPI application for Render deployment
"""
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from datetime import datetime
from pymongo.errors import OperationFailure
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
from app.api.v1.endpoints import sync

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
    logger.info(f"   Offline Sync: {'Enabled' if settings.SYNC_ENABLED else 'Disabled'}")
    logger.info("=" * 60)

    startup_start = time.time()

    # Connect to MongoDB
    try:
        logger.info("📦 Connecting to MongoDB...")
        connected = await connect_to_mongo()

        if connected:
            logger.info("✅ MongoDB connection established")
            
            # Initialize sync indexes
            if settings.SYNC_ENABLED:
                await initialize_sync_collections()
            
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
    logger.info(f"🔄 Sync Endpoint: {settings.API_V1_PREFIX}/sync")
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
# INITIALIZE SYNC COLLECTIONS
# =========================================================================
async def initialize_sync_collections():
    """
    Create indexes for sync-related collections.
    Handles existing indexes gracefully.
    """
    db = get_database()
    
    if db is None:
        logger.warning("⚠️  Cannot initialize sync collections: database not connected")
        return

    try:
        # Sync conflicts collection indexes
        await _safe_create_index(db.sync_conflicts, "status")
        await _safe_create_index(db.sync_conflicts, "user_id")
        await _safe_create_index(db.sync_conflicts, "entity_type")
        await _safe_create_index(db.sync_conflicts, "created_at")
        
        # Sync log collection indexes
        await _safe_create_index(db.sync_log, "user_id")
        await _safe_create_index(db.sync_log, "status")
        
        # Handle timestamp index with TTL
        try:
            await db.sync_log.drop_index("timestamp_1")
            logger.info("   Dropped existing timestamp_1 index")
        except OperationFailure:
            pass
        except Exception:
            pass
        
        await _safe_create_index(
            db.sync_log,
            "timestamp",
            expireAfterSeconds=settings.SYNC_LOG_RETENTION_DAYS * 24 * 60 * 60
        )
        
        logger.info("✅ Sync collection indexes created")
        
    except Exception as e:
        logger.warning(f"⚠️  Sync collection initialization warning: {e}")


async def _safe_create_index(collection, field, **kwargs):
    """Safely create an index, ignoring if it already exists."""
    try:
        index_spec = [(field, 1)] if isinstance(field, str) else field
        await collection.create_index(index_spec, **kwargs)
    except OperationFailure as e:
        if "already exists" in str(e).lower():
            logger.debug(f"   Index on '{field}' already exists, skipping")
        else:
            raise
    except Exception as e:
        logger.warning(f"   Could not create index on '{field}': {e}")


# =========================================================================
# SEED DEFAULT DATA
# =========================================================================
async def seed_default_data():
    """Seed default school information and admin user"""
    db = get_database()
    
    if db is None:
        logger.warning("⚠️  Cannot seed data: database not connected")
        return

    try:
        from app.services.auth_service import create_initial_admin
        await create_initial_admin(db)

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
                "core_values": ["Excellence", "Integrity", "Compassion", "Respect", "Responsibility"],
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
            updates = {}
            if not school_info.get("logo_url"):
                updates["logo_url"] = "/logo.png"
            if not school_info.get("letterhead_url"):
                updates["letterhead_url"] = "/letter-head.jpg"
            if updates:
                await db.school_info.update_one({"_id": school_info["_id"]}, {"$set": updates})
                logger.info("✅ Logo and letterhead URLs added to existing school info")
            logger.info("ℹ️  School info already exists")

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
    """Initialize and clean up services on startup"""
    db = get_database()
    
    if db is None:
        return

    try:
        now = datetime.utcnow()
        result = await db.teacher_leaves.update_many(
            {"status": "approved", "end_date": {"$lt": now}},
            {"$set": {"status": "completed", "updated_at": now}}
        )
        if result.modified_count > 0:
            logger.info(f"✅ Marked {result.modified_count} leaves as completed")

        result = await db.users.update_many(
            {"reset_token_expires": {"$lt": now}},
            {"$unset": {"reset_token": "", "reset_token_expires": ""}}
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time", "X-Sync-Status"],
    max_age=3600
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


# =========================================================================
# CUSTOM REQUEST MIDDLEWARE
# =========================================================================
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """Custom middleware for request tracking and logging"""
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    start_time = time.time()
    
    logger.info(f"📥 [{request_id}] {request.method} {request.url.path} from {request.client.host if request.client else 'unknown'}")

    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{process_time:.3f}s"
        if "/sync" in request.url.path:
            response.headers["X-Sync-Status"] = "completed"
        logger.info(f"📤 [{request_id}] {response.status_code} ({process_time:.3f}s)")
        return response

    except Exception as e:
        logger.error(f"❌ [{request_id}] Request failed: {e}", exc_info=True)
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
    logger.warning(f"⚠️  [{getattr(request.state, 'request_id', 'unknown')}] Validation error: {exc.errors()}")
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
    logger.warning(f"⚠️  [{getattr(request.state, 'request_id', 'unknown')}] HTTP {exc.status_code}: {exc.detail}")
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
    logger.error(f"❌ [{getattr(request.state, 'request_id', 'unknown')}] Unhandled error: {exc}", exc_info=True)
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
    origin = request.headers.get("origin", "")
    if origin in settings.ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response


# =========================================================================
# REPORT VERIFICATION ENDPOINTS (Public - No Auth Required)
# =========================================================================

@app.get("/verify-report/{student_id}")
async def verify_report(student_id: str):
    """
    Public JSON endpoint to verify a student's report card.
    No authentication required - accessible via QR code or link on report card.
    """
    db = get_database()
    
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        from bson import ObjectId
        
        student = None
        try:
            obj_id = ObjectId(student_id)
            student = await db.students.find_one({"_id": obj_id})
        except Exception:
            pass
        
        if not student:
            student = await db.students.find_one({
                "$or": [
                    {"student_id": student_id},
                    {"student_id_number": student_id},
                    {"id_number": student_id},
                    {"admission_number": student_id}
                ]
            })
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
        student_id_number = student.get("student_id") or student.get("student_id_number") or student.get("id_number") or student.get("admission_number") or str(student.get("_id", ""))
        
        class_name = ""
        if student.get("current_class_id"):
            cls = await db.classes.find_one({"_id": student["current_class_id"]})
            if cls:
                class_name = cls.get("class_name", "")
        
        student_oid = student.get("_id")
        results = await db.exam_results.find({"student_id": student_oid}).sort("created_at", -1).to_list(length=100)
        
        terms_summary = {}
        for r in results:
            term = r.get("term", "Unknown")
            if term not in terms_summary:
                terms_summary[term] = {"subjects": 0, "passed": 0, "failed": 0}
            terms_summary[term]["subjects"] += 1
            if r.get("is_passed"):
                terms_summary[term]["passed"] += 1
            else:
                terms_summary[term]["failed"] += 1
        
        school = await db.school_info.find_one({}) or {}
        
        return {
            "success": True,
            "message": "Report card verified",
            "data": {
                "student": {
                    "name": student_name,
                    "student_id": str(student_id_number),
                    "class_name": class_name,
                    "status": student.get("status", "active")
                },
                "academic_summary": terms_summary,
                "total_exams": len(results),
                "school": {
                    "name": school.get("school_name", "Heavenly Nature Nursery & Primary School"),
                    "motto": school.get("motto", "Nurturing Right Leaders"),
                    "phone": school.get("phone", ""),
                    "email": school.get("email", "")
                },
                "verified_at": datetime.utcnow().isoformat(),
                "verification_status": "valid"
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify report card")


@app.get("/verify-report/{student_id}/page")
async def verify_report_page(student_id: str):
    """
    Public HTML page for report card verification.
    Shows a beautiful verification result for humans viewing the link.
    """
    db = get_database()
    
    if db is None:
        return HTMLResponse(content="<h1>Service Unavailable</h1><p>Please try again later.</p>", status_code=503)
    
    try:
        from bson import ObjectId
        
        student = None
        try:
            obj_id = ObjectId(student_id)
            student = await db.students.find_one({"_id": obj_id})
        except Exception:
            pass
        
        if not student:
            student = await db.students.find_one({
                "$or": [
                    {"student_id": student_id},
                    {"student_id_number": student_id},
                    {"id_number": student_id},
                    {"admission_number": student_id}
                ]
            })
        
        if not student:
            return HTMLResponse(content=f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invalid Report Card</title>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; text-align: center; padding: 50px 20px; background: #f5f5f5; }}
                    .card {{ background: white; padding: 30px; border-radius: 12px; max-width: 420px; margin: 40px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
                    .icon {{ font-size: 56px; margin-bottom: 15px; }}
                    h2 {{ margin: 10px 0; font-size: 20px; }}
                    p {{ color: #555; margin: 8px 0; font-size: 14px; }}
                    .id {{ color: #999; font-size: 12px; margin-top: 15px; }}
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">❌</div>
                    <h2 style="color:#dc2626">Invalid Report Card</h2>
                    <p>This report card could not be verified.</p>
                    <p>The student ID may be invalid or the record may not exist in our system.</p>
                    <p class="id">Verification ID: {student_id}</p>
                </div>
            </body>
            </html>
            """, status_code=404)
        
        student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
        student_id_number = student.get("student_id") or student.get("student_id_number") or str(student.get("_id", ""))
        
        class_name = ""
        if student.get("current_class_id"):
            cls = await db.classes.find_one({"_id": student["current_class_id"]})
            if cls:
                class_name = cls.get("class_name", "")
        
        school = await db.school_info.find_one({}) or {}
        school_name = school.get("school_name", "Heavenly Nature Nursery & Primary School")
        
        results = await db.exam_results.find({"student_id": student.get("_id")}).sort("created_at", -1).to_list(length=50)
        
        results_html = ""
        if results:
            results_html = """
            <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px">
                <tr style="background:#1a56db;color:white">
                    <th style="padding:10px 8px;text-align:left;border-radius:6px 0 0 0">Subject</th>
                    <th style="padding:10px 8px;text-align:center">Score</th>
                    <th style="padding:10px 8px;text-align:center">Grade</th>
                    <th style="padding:10px 8px;text-align:center;border-radius:0 6px 0 0">Term</th>
                </tr>"""
            for r in results[:20]:
                exam = await db.exams.find_one({"_id": r.get("exam_id")}) if r.get("exam_id") else None
                subject = exam.get("subject_name") or exam.get("exam_name", "N/A") if exam else "N/A"
                grade = r.get('grade', 'N/A')
                grade_color = '#059669' if grade in ['A', 'B'] else '#d97706' if grade in ['C', 'D'] else '#dc2626'
                results_html += f"""
                <tr style="border-bottom:1px solid #eee">
                    <td style="padding:8px">{subject}</td>
                    <td style="padding:8px;text-align:center;font-weight:600">{r.get('score', 'N/A')}</td>
                    <td style="padding:8px;text-align:center;color:{grade_color};font-weight:bold">{grade}</td>
                    <td style="padding:8px;text-align:center;color:#666">{r.get('term', 'N/A')}</td>
                </tr>"""
            results_html += "</table>"
        
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Report Card Verified - {student_name}</title>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; text-align: center; padding: 20px; background: #f0f4f8; }}
                .card {{ background: white; padding: 30px; border-radius: 12px; max-width: 520px; margin: 20px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
                .icon {{ font-size: 56px; margin-bottom: 10px; }}
                h2 {{ color: #1a3a6b; margin: 10px 0 5px; font-size: 20px; }}
                .name {{ font-size: 18px; font-weight: bold; color: #1a3a6b; margin: 15px 0 5px; }}
                .detail {{ color: #555; margin: 4px 0; font-size: 14px; }}
                .badge {{ display: inline-block; background: #059669; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0; }}
                .footer {{ margin-top: 20px; font-size: 11px; color: #999; }}
                .footer p {{ margin: 3px 0; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✅</div>
                <h2>Report Card Verified</h2>
                <p style="color:#059669;font-weight:600">This is an authentic report card</p>
                <p class="name">{student_name}</p>
                <p class="detail"><strong>Student ID:</strong> {student_id_number}</p>
                <p class="detail"><strong>Class:</strong> {class_name}</p>
                <span class="badge">Active Student</span>
                {results_html}
                <div class="footer">
                    <p>Verified by <strong>{school_name}</strong></p>
                    <p>This report card is authentic and officially issued by the school.</p>
                    <p style="margin-top:8px">Verified at: {datetime.utcnow().strftime('%d/%m/%Y, %H:%M:%S')}</p>
                </div>
            </div>
        </body>
        </html>
        """)
    
    except Exception as e:
        logger.error(f"Verification page error: {e}")
        return HTMLResponse(content="<h1>Error</h1><p>Could not verify report card. Please try again later.</p>", status_code=500)


# =========================================================================
# API ROUTES
# =========================================================================
API_PREFIX = settings.API_V1_PREFIX

app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{API_PREFIX}/users", tags=["Users"])
app.include_router(students.router, prefix=f"{API_PREFIX}/students", tags=["Students"])
app.include_router(teachers.router, prefix=f"{API_PREFIX}/teachers", tags=["Teachers"])
app.include_router(classes.router, prefix=f"{API_PREFIX}/classes", tags=["Classes"])
app.include_router(attendance.router, prefix=f"{API_PREFIX}/attendance", tags=["Attendance"])
app.include_router(exams.router, prefix=f"{API_PREFIX}/exams", tags=["Examinations"])
app.include_router(financial.router, prefix=f"{API_PREFIX}/financial", tags=["Finance"])
app.include_router(reports.router, prefix=f"{API_PREFIX}/reports", tags=["Reports"])
app.include_router(school.router, prefix=f"{API_PREFIX}/school", tags=["School"])
app.include_router(sync.router, prefix=f"{API_PREFIX}/sync", tags=["Sync"])


# =========================================================================
# ROOT ENDPOINTS
# =========================================================================
@app.get("/")
async def root():
    return {
        "success": True,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "api_prefix": settings.API_V1_PREFIX,
        "sync_enabled": settings.SYNC_ENABLED
    }


@app.get("/health")
async def health_check():
    db_health = await check_database_health()
    return {
        "success": True,
        "status": "healthy" if db_health.get("status") == "healthy" else "degraded",
        "database": db_health,
        "connection": get_connection_status(),
        "sync_enabled": settings.SYNC_ENABLED,
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": "available"
    }


@app.get("/api")
async def api_info():
    return {
        "success": True,
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "api_version": "v1",
        "base_url": settings.API_V1_PREFIX,
        "documentation": "/docs",
        "sync_enabled": settings.SYNC_ENABLED,
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
            "school": f"{settings.API_V1_PREFIX}/school",
            "sync": f"{settings.API_V1_PREFIX}/sync"
        }
    }


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
