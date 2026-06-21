# hnsdb/app/core/config.py
"""
Core Configuration
Production-ready settings for Render deployment
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, validator
from typing import List, Optional, Dict, Any
import json
from datetime import timedelta


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
    APP_NAME: str = Field(default="Heavenly Nature School Management System")
    APP_VERSION: str = Field(default="2.0.0")
    APP_DESCRIPTION: str = Field(default="Comprehensive school management system for Heavenly Nature Nursery & Primary School")
    DEBUG: bool = Field(default=False)
    ENVIRONMENT: str = Field(default="production")
    API_V1_PREFIX: str = Field(default="/api/v1")
    
    # =========================================================================
    # SECURITY SETTINGS
    # =========================================================================
    JWT_SECRET_KEY: str = Field(default="change-this-to-a-random-secret-key")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(default=60)
    SESSION_TIMEOUT_MINUTES: int = Field(default=30)
    MAX_LOGIN_ATTEMPTS: int = Field(default=5)
    ACCOUNT_LOCKOUT_MINUTES: int = Field(default=30)
    PASSWORD_EXPIRY_DAYS: int = Field(default=90)
    PASSWORD_HISTORY_COUNT: int = Field(default=5)
    
    # =========================================================================
    # DATABASE SETTINGS
    # =========================================================================
    MONGODB_URL: str = Field(default="mongodb://localhost:27017")
    MONGODB_DB_NAME: str = Field(default="hnsdb")
    MONGODB_MAX_POOL_SIZE: int = Field(default=10)
    MONGODB_MIN_POOL_SIZE: int = Field(default=2)
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: int = Field(default=15000)
    MONGODB_CONNECT_TIMEOUT_MS: int = Field(default=15000)
    
    # =========================================================================
    # CLOUDFLARE R2 STORAGE (Optional)
    # =========================================================================
    R2_ACCESS_KEY_ID: Optional[str] = Field(default=None)
    R2_SECRET_ACCESS_KEY: Optional[str] = Field(default=None)
    R2_ENDPOINT_URL: Optional[str] = Field(default=None)
    R2_BUCKET_NAME: str = Field(default="school-files")
    R2_PUBLIC_URL: Optional[str] = Field(default=None)
    
    # =========================================================================
    # BREVO EMAIL (Optional)
    # =========================================================================
    BREVO_API_KEY: Optional[str] = Field(default=None)
    EMAIL_ENABLED: bool = Field(default=False)
    EMAIL_FROM: str = Field(default="info@heavenlynatureschools.com")
    EMAIL_FROM_NAME: str = Field(default="Heavenly Nature Nursery & Primary School")
    SMTP_HOST: Optional[str] = Field(default=None)
    SMTP_PORT: int = Field(default=587)
    SMTP_USER: Optional[str] = Field(default=None)
    SMTP_PASSWORD: Optional[str] = Field(default=None)
    
    # =========================================================================
    # CORS SETTINGS - Production Only
    # =========================================================================
    ALLOWED_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "https://hnsdbapi.vercel.app",
        ]
    )
    ALLOWED_METHODS: List[str] = Field(
        default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    )
    ALLOWED_HEADERS: List[str] = Field(default_factory=lambda: ["*"])
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    
    @validator('ALLOWED_ORIGINS', pre=True)
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from string or list"""
        if isinstance(v, str):
            if v.startswith('['):
                return json.loads(v)
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
    # =========================================================================
    # FILE UPLOAD SETTINGS
    # =========================================================================
    MAX_UPLOAD_SIZE: int = Field(default=5 * 1024 * 1024)
    ALLOWED_IMAGE_TYPES: List[str] = Field(
        default_factory=lambda: ["image/jpeg", "image/png", "image/gif", "image/webp"]
    )
    
    # =========================================================================
    # ADMIN SEED
    # =========================================================================
    ADMIN_EMAIL: str = Field(default="admin@heavenlynatureschools.com")
    ADMIN_PASSWORD: str = Field(default="Admin@2024!")
    ADMIN_FIRST_NAME: str = Field(default="System")
    ADMIN_LAST_NAME: str = Field(default="Administrator")
    
    # =========================================================================
    # SCHOOL INFORMATION
    # =========================================================================
    SCHOOL_NAME: str = Field(default="Heavenly Nature Nursery & Primary School")
    SCHOOL_SHORT_NAME: str = Field(default="HNS")
    SCHOOL_MOTTO: str = Field(default="Nurturing Right Leaders")
    SCHOOL_EMAIL: str = Field(default="info@heavenlynatureschools.com")
    SCHOOL_PHONE: str = Field(default="+211 922 273 334")
    SCHOOL_ADDRESS: str = Field(default="Juba, South Sudan")
    SCHOOL_WEBSITE: Optional[str] = Field(default="https://heavenlynatureschools.com")
    
    # =========================================================================
    # ACADEMIC SETTINGS
    # =========================================================================
    TERMS_PER_YEAR: int = Field(default=3)
    PASS_MARK_PERCENTAGE: float = Field(default=50.0)
    MAX_STUDENTS_PER_CLASS: int = Field(default=25)
    NURSERY_MAX_STUDENTS: int = Field(default=20)
    PRIMARY_MAX_STUDENTS: int = Field(default=25)
    MIN_ENROLLMENT_AGE: int = Field(default=3)
    
    # =========================================================================
    # ATTENDANCE SETTINGS
    # =========================================================================
    CHRONIC_ABSENCE_THRESHOLD: float = Field(default=75.0)
    ATTENDANCE_WARNING_THRESHOLD: float = Field(default=85.0)
    CONSECUTIVE_ABSENCE_WARNING: int = Field(default=3)
    CONSECUTIVE_ABSENCE_CRITICAL: int = Field(default=5)
    
    # =========================================================================
    # LOGGING
    # =========================================================================
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    LOG_FILE: Optional[str] = Field(default=None)
    
    # =========================================================================
    # CACHE (Optional)
    # =========================================================================
    CACHE_ENABLED: bool = Field(default=False)
    CACHE_TTL_SECONDS: int = Field(default=300)
    REDIS_URL: Optional[str] = Field(default=None)
    
    # =========================================================================
    # RATE LIMITING
    # =========================================================================
    RATE_LIMIT_ENABLED: bool = Field(default=False)
    RATE_LIMIT_REQUESTS: int = Field(default=100)
    RATE_LIMIT_WINDOW_SECONDS: int = Field(default=60)
    
    # =========================================================================
    # PAGINATION
    # =========================================================================
    DEFAULT_PAGE_SIZE: int = Field(default=20)
    MAX_PAGE_SIZE: int = Field(default=100)
    
    # =========================================================================
    # PROPERTIES
    # =========================================================================
    @property
    def token_expiry(self) -> timedelta:
        return timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    @property
    def refresh_token_expiry(self) -> timedelta:
        return timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @validator('ENVIRONMENT')
    def validate_environment(cls, v):
        allowed = ['development', 'staging', 'production']
        if v not in allowed:
            raise ValueError(f'Environment must be one of: {", ".join(allowed)}')
        return v
    
    @validator('LOG_LEVEL')
    def validate_log_level(cls, v):
        allowed = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in allowed:
            raise ValueError(f'Log level must be one of: {", ".join(allowed)}')
        return v.upper()


settings = Settings()


def get_settings() -> Settings:
    return settings
