"""
Core Configuration
Production-ready settings with comprehensive environment management
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, EmailStr, validator, AnyHttpUrl
from typing import List, Optional, Dict, Any
import os
import secrets
from datetime import timedelta
from pathlib import Path


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )
    
    # =========================================================================
    # APPLICATION SETTINGS
    # =========================================================================
    APP_NAME: str = Field(
        default="Heavenly Nature School Management System",
        description="Application name"
    )
    APP_VERSION: str = Field(default="2.0.0", description="Application version")
    APP_DESCRIPTION: str = Field(
        default="Comprehensive school management system for Heavenly Nature Nursery & Primary School",
        description="Application description"
    )
    DEBUG: bool = Field(default=False, description="Debug mode")
    ENVIRONMENT: str = Field(
        default="development",
        description="Environment: development, staging, production"
    )
    API_V1_PREFIX: str = Field(default="/api/v1", description="API version prefix")
    PROJECT_NAME: str = Field(default="Heavenly Nature School API", description="Project name")
    
    # Server
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    WORKERS: int = Field(default=4, description="Number of worker processes")
    
    # Base directory
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    
    # =========================================================================
    # SECURITY SETTINGS
    # =========================================================================
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        description="Application secret key"
    )
    JWT_SECRET_KEY: str = Field(
        default="your-super-secret-key-change-in-production",
        description="JWT signing secret key"
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Access token expiry in minutes"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token expiry in days"
    )
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60,
        description="Password reset token expiry in minutes"
    )
    
    # Session
    SESSION_TIMEOUT_MINUTES: int = Field(
        default=30,
        description="Session timeout due to inactivity"
    )
    MAX_LOGIN_ATTEMPTS: int = Field(
        default=5,
        description="Maximum failed login attempts before lockout"
    )
    ACCOUNT_LOCKOUT_MINUTES: int = Field(
        default=30,
        description="Account lockout duration in minutes"
    )
    PASSWORD_EXPIRY_DAYS: int = Field(
        default=90,
        description="Days before password must be changed"
    )
    PASSWORD_HISTORY_COUNT: int = Field(
        default=5,
        description="Number of previous passwords to remember"
    )
    
    # =========================================================================
    # DATABASE SETTINGS
    # =========================================================================
    MONGODB_URL: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB connection URL"
    )
    MONGODB_DB_NAME: str = Field(
        default="heavenly_nature_school",
        description="MongoDB database name"
    )
    MONGODB_MAX_POOL_SIZE: int = Field(
        default=10,
        description="MongoDB connection pool size"
    )
    MONGODB_MIN_POOL_SIZE: int = Field(
        default=2,
        description="MongoDB minimum pool size"
    )
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: int = Field(
        default=5000,
        description="Server selection timeout in milliseconds"
    )
    MONGODB_CONNECT_TIMEOUT_MS: int = Field(
        default=5000,
        description="Connection timeout in milliseconds"
    )
    
    # =========================================================================
    # CLOUDFLARE R2 STORAGE SETTINGS
    # =========================================================================
    R2_ACCESS_KEY_ID: Optional[str] = Field(
        default=None,
        description="Cloudflare R2 access key ID"
    )
    R2_SECRET_ACCESS_KEY: Optional[str] = Field(
        default=None,
        description="Cloudflare R2 secret access key"
    )
    R2_ENDPOINT_URL: Optional[str] = Field(
        default=None,
        description="Cloudflare R2 endpoint URL"
    )
    R2_BUCKET_NAME: str = Field(
        default="school-files",
        description="R2 bucket name"
    )
    R2_PUBLIC_URL: Optional[str] = Field(
        default=None,
        description="R2 public access URL"
    )
    R2_REGION: str = Field(default="auto", description="R2 region")
    
    # =========================================================================
    # BREVO TRANSACTIONAL EMAIL SETTINGS
    # =========================================================================
    BREVO_API_KEY: Optional[str] = Field(
        default=None,
        description="Brevo (Sendinblue) API key for transactional emails"
    )
    EMAIL_ENABLED: bool = Field(
        default=False,
        description="Enable email notifications"
    )
    EMAIL_FROM: str = Field(
        default="info@heavenlynatureschools.com",
        description="From email address for transactional emails"
    )
    EMAIL_FROM_NAME: str = Field(
        default="Heavenly Nature Nursery & Primary School",
        description="From name for transactional emails"
    )
    
    # SMTP (Fallback/Alternative to Brevo API)
    SMTP_HOST: Optional[str] = Field(default=None, description="SMTP host")
    SMTP_PORT: int = Field(default=587, description="SMTP port")
    SMTP_USER: Optional[str] = Field(default=None, description="SMTP username")
    SMTP_PASSWORD: Optional[str] = Field(default=None, description="SMTP password")
    SMTP_USE_TLS: bool = Field(default=True, description="Use TLS for SMTP")
    
    # =========================================================================
    # CORS SETTINGS
    # =========================================================================
    ALLOWED_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "https://heavenlynature.vercel.app",
            "https://heavenly-nature-school.vercel.app",
        ],
        description="Allowed CORS origins"
    )
    ALLOWED_METHODS: List[str] = Field(
        default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        description="Allowed HTTP methods"
    )
    ALLOWED_HEADERS: List[str] = Field(
        default_factory=lambda: ["*"],
        description="Allowed HTTP headers"
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        description="Allow credentials in CORS"
    )
    

    @validator('ALLOWED_ORIGINS', pre=True)
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from string or list"""
        if isinstance(v, str):
            if v.startswith('['):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v

    # =========================================================================
    # FILE UPLOAD SETTINGS
    # =========================================================================
    MAX_UPLOAD_SIZE: int = Field(
        default=5 * 1024 * 1024,  # 5MB
        description="Maximum upload size in bytes"
    )
    MAX_UPLOAD_SIZE_MB: int = Field(default=5, description="Maximum upload size in MB")
    ALLOWED_IMAGE_TYPES: List[str] = Field(
        default_factory=lambda: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        description="Allowed image MIME types"
    )
    ALLOWED_DOCUMENT_TYPES: List[str] = Field(
        default_factory=lambda: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "image/jpeg",
            "image/png",
        ],
        description="Allowed document MIME types"
    )
    
    # =========================================================================
    # ADMIN SEED SETTINGS
    # =========================================================================
    ADMIN_EMAIL: str = Field(
        default="admin@heavenlynatureschools.com",
        description="Default admin email"
    )
    ADMIN_PASSWORD: str = Field(
        default="Admin@2024!",
        description="Default admin password"
    )
    ADMIN_FIRST_NAME: str = Field(
        default="System",
        description="Default admin first name"
    )
    ADMIN_LAST_NAME: str = Field(
        default="Administrator",
        description="Default admin last name"
    )
    
    # =========================================================================
    # SCHOOL INFORMATION
    # =========================================================================
    SCHOOL_NAME: str = Field(
        default="Heavenly Nature Nursery & Primary School",
        description="School name"
    )
    SCHOOL_SHORT_NAME: str = Field(
        default="HNS",
        description="School short name"
    )
    SCHOOL_MOTTO: str = Field(
        default="Nurturing Right Leaders",
        description="School motto"
    )
    SCHOOL_EMAIL: str = Field(
        default="info@heavenlynatureschools.com",
        description="School contact email"
    )
    SCHOOL_PHONE: str = Field(
        default="+211 922 273 334",
        description="School contact phone"
    )
    SCHOOL_ADDRESS: str = Field(
        default="Juba, South Sudan",
        description="School address"
    )
    SCHOOL_WEBSITE: Optional[str] = Field(
        default="https://heavenlynatureschools.com",
        description="School website"
    )
    
    # =========================================================================
    # ACADEMIC SETTINGS
    # =========================================================================
    DEFAULT_ACADEMIC_YEAR: Optional[str] = Field(
        default=None,
        description="Default academic year"
    )
    TERMS_PER_YEAR: int = Field(default=3, description="Number of terms per year")
    PASS_MARK_PERCENTAGE: float = Field(
        default=50.0,
        description="Default pass mark percentage"
    )
    MAX_STUDENTS_PER_CLASS: int = Field(
        default=25,
        description="Default maximum students per class"
    )
    NURSERY_MAX_STUDENTS: int = Field(
        default=20,
        description="Maximum students in nursery classes"
    )
    PRIMARY_MAX_STUDENTS: int = Field(
        default=25,
        description="Maximum students in primary classes"
    )
    MIN_ENROLLMENT_AGE: int = Field(
        default=3,
        description="Minimum age for enrollment"
    )
    
    # =========================================================================
    # ATTENDANCE SETTINGS
    # =========================================================================
    CHRONIC_ABSENCE_THRESHOLD: float = Field(
        default=75.0,
        description="Attendance rate below which is chronic absence"
    )
    ATTENDANCE_WARNING_THRESHOLD: float = Field(
        default=85.0,
        description="Attendance rate below which triggers warning"
    )
    CONSECUTIVE_ABSENCE_WARNING: int = Field(
        default=3,
        description="Consecutive absences for warning"
    )
    CONSECUTIVE_ABSENCE_CRITICAL: int = Field(
        default=5,
        description="Consecutive absences for critical alert"
    )
    
    # =========================================================================
    # LOGGING SETTINGS
    # =========================================================================
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    LOG_FORMAT: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log format"
    )
    LOG_FILE: Optional[str] = Field(
        default=None,
        description="Log file path"
    )
    
    # =========================================================================
    # CACHE SETTINGS
    # =========================================================================
    CACHE_ENABLED: bool = Field(default=False, description="Enable caching")
    CACHE_TTL_SECONDS: int = Field(
        default=300,
        description="Cache time-to-live in seconds"
    )
    REDIS_URL: Optional[str] = Field(
        default=None,
        description="Redis connection URL"
    )
    
    # =========================================================================
    # RATE LIMITING
    # =========================================================================
    RATE_LIMIT_ENABLED: bool = Field(
        default=True,
        description="Enable rate limiting"
    )
    RATE_LIMIT_REQUESTS: int = Field(
        default=100,
        description="Requests per window"
    )
    RATE_LIMIT_WINDOW_SECONDS: int = Field(
        default=60,
        description="Rate limit window in seconds"
    )
    
    # =========================================================================
    # PAGINATION DEFAULTS
    # =========================================================================
    DEFAULT_PAGE_SIZE: int = Field(default=20, description="Default page size")
    MAX_PAGE_SIZE: int = Field(default=100, description="Maximum page size")
    
    # =========================================================================
    # PROPERTIES
    # =========================================================================
    @property
    def token_expiry(self) -> timedelta:
        """Get access token expiry as timedelta"""
        return timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    @property
    def refresh_token_expiry(self) -> timedelta:
        """Get refresh token expiry as timedelta"""
        return timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENVIRONMENT == "development"
    
    @property
    def is_staging(self) -> bool:
        """Check if running in staging mode"""
        return self.ENVIRONMENT == "staging"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT == "production"
    
    @property
    def mongodb_settings(self) -> Dict[str, Any]:
        """Get MongoDB connection settings"""
        return {
            "maxPoolSize": self.MONGODB_MAX_POOL_SIZE,
            "minPoolSize": self.MONGODB_MIN_POOL_SIZE,
            "serverSelectionTimeoutMS": self.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
            "connectTimeoutMS": self.MONGODB_CONNECT_TIMEOUT_MS,
        }
    
    @property
    def cors_settings(self) -> Dict[str, Any]:
        """Get CORS settings"""
        return {
            "allow_origins": self.ALLOWED_ORIGINS,
            "allow_methods": self.ALLOWED_METHODS,
            "allow_headers": self.ALLOWED_HEADERS,
            "allow_credentials": self.CORS_ALLOW_CREDENTIALS,
        }
    
    @validator('ENVIRONMENT')
    def validate_environment(cls, v):
        """Validate environment value"""
        allowed = ['development', 'staging', 'production']
        if v not in allowed:
            raise ValueError(f'Environment must be one of: {", ".join(allowed)}')
        return v
    
    @validator('LOG_LEVEL')
    def validate_log_level(cls, v):
        """Validate log level"""
        allowed = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in allowed:
            raise ValueError(f'Log level must be one of: {", ".join(allowed)}')
        return v.upper()


# Create global settings instance
settings = Settings()


# Export commonly used settings
def get_settings() -> Settings:
    """Get settings instance"""
    return settings