"""
Security Module
Production-ready authentication, authorization, and security utilities
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt, ExpiredSignatureError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import logging
import hashlib
import secrets

from app.core.config import settings
from app.core.database import get_database

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

security = HTTPBearer(
    scheme_name="JWT",
    description="Enter your JWT token",
    auto_error=True
)


# =========================================================================
# PASSWORD UTILITIES
# =========================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def generate_secure_token(length: int = 32) -> str:
    return secrets.token_hex(length)


def hash_string(value: str, algorithm: str = "sha256") -> str:
    hash_func = getattr(hashlib, algorithm, hashlib.sha256)
    return hash_func(value.encode()).hexdigest()


# =========================================================================
# JWT TOKENS
# =========================================================================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or settings.token_expiry
    )

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": generate_secure_token(16)
    })

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or settings.refresh_token_expiry
    )

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": generate_secure_token(16)
    })

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )


def create_password_reset_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    )

    return jwt.encode(
        {
            "sub": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "password_reset",
            "purpose": "password_reset"
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str, verify_type: Optional[str] = None) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": True}
        )

        if verify_type and payload.get("type") != verify_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type: {verify_type}"
            )

        return payload

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =========================================================================
# AUTH DEPENDENCY (FIXED CRITICAL BUG)
# =========================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None
) -> Dict[str, Any]:

    token = credentials.credentials
    payload = decode_token(token, verify_type="access")

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user id")

    # 🔥 FIX: await database properly (THIS WAS YOUR CRASH CAUSE)
    db = get_database()

    user = await db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.get("status") == "locked":
        raise HTTPException(status_code=423, detail="Account locked")

    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended")

    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account inactive")

    # Optional password expiry flag
    if user.get("password_changed_at"):
        age = datetime.utcnow() - user["password_changed_at"]
        if age.days > settings.PASSWORD_EXPIRY_DAYS:
            user["password_expired"] = True

    user["_id"] = str(user["_id"])
    return user


async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return current_user


# =========================================================================
# ROLE / PERMISSION SYSTEM
# =========================================================================

def require_role(*roles: str):
    async def checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=403,
                detail="Insufficient role permissions"
            )
        return current_user

    return checker


def require_permission(*permissions: str):
    async def checker(current_user: Dict[str, Any] = Depends(get_current_user)):

        user_permissions = current_user.get("permissions", [])

        if "*" in user_permissions or current_user.get("role") == "admin":
            return current_user

        for perm in permissions:
            if perm not in user_permissions:
                raise HTTPException(
                    status_code=403,
                    detail=f"Missing permission: {perm}"
                )

        return current_user

    return checker


# =========================================================================
# RATE LIMITING
# =========================================================================

class RateLimiter:
    """Simple in-memory rate limiter"""

    _requests: Dict[str, List[datetime]] = {}

    @classmethod
    def is_rate_limited(
        cls,
        key: str,
        max_requests: int = None,
        window_seconds: int = None
    ) -> bool:
        """
        Check if request should be rate limited
        """
        if not settings.RATE_LIMIT_ENABLED:
            return False

        max_req = max_requests or settings.RATE_LIMIT_REQUESTS
        window = window_seconds or settings.RATE_LIMIT_WINDOW_SECONDS

        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window)

        if key in cls._requests:
            cls._requests[key] = [
                t for t in cls._requests[key] if t > window_start
            ]
        else:
            cls._requests[key] = []

        if len(cls._requests[key]) >= max_req:
            return True

        cls._requests[key].append(now)
        return False

    @classmethod
    def get_remaining(cls, key: str) -> int:
        max_req = settings.RATE_LIMIT_REQUESTS
        return max(0, max_req - len(cls._requests.get(key, [])))

    @classmethod
    def reset(cls, key: str):
        if key in cls._requests:
            del cls._requests[key]

    # ============================================================
    # 🔐 NEW: LOGIN BRUTE FORCE PROTECTION
    # ============================================================

    @classmethod
    def check_login_limit(cls, ip: str, email: str) -> None:
        """
        Enforce login rate limits for IP + email.
        Raises HTTPException if blocked.
        """
        from fastapi import HTTPException, status

        ip_key = f"login:ip:{ip}"
        email_key = f"login:email:{email.lower()}"

        # -------------------------------
        # IP-based protection (global)
        # -------------------------------
        if cls.is_rate_limited(
            ip_key,
            max_requests=20,
            window_seconds=900  # 15 minutes
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts from this IP. Please try again later."
            )

        # -------------------------------
        # Email-based protection (targeted brute force)
        # -------------------------------
        if cls.is_rate_limited(
            email_key,
            max_requests=10,
            window_seconds=900  # 15 minutes
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts for this account. Please try again later."
        )
            
# =========================================================================
# UTILS
# =========================================================================

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    return request.client.host if request.client else "unknown"


def generate_api_key() -> str:
    return f"hns_{secrets.token_hex(24)}"
