"""
Security Module
Production-ready authentication, authorization, and security utilities
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Union
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
    bcrypt__rounds=12  # Higher rounds for better security
)

# Bearer token security scheme
security = HTTPBearer(
    scheme_name="JWT",
    description="Enter your JWT token",
    auto_error=True
)


# =========================================================================
# PASSWORD UTILITIES
# =========================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against hashed password
    
    Args:
        plain_password: Plain text password
        hashed_password: Bcrypt hashed password
        
    Returns:
        True if password matches
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Generate password hash using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token
    
    Args:
        length: Token length in bytes
        
    Returns:
        Hex-encoded token string
    """
    return secrets.token_hex(length)


def hash_string(value: str, algorithm: str = "sha256") -> str:
    """
    Hash a string using specified algorithm
    
    Args:
        value: String to hash
        algorithm: Hash algorithm (sha256, sha512, md5)
        
    Returns:
        Hashed string
    """
    hash_func = getattr(hashlib, algorithm, hashlib.sha256)
    return hash_func(value.encode()).hexdigest()


# =========================================================================
# JWT TOKEN UTILITIES
# =========================================================================

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT access token
    
    Args:
        data: Token payload data
        expires_delta: Custom expiry time
        
    Returns:
        Encoded JWT access token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + settings.token_expiry
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": generate_secure_token(16)  # Unique token ID
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT refresh token
    
    Args:
        data: Token payload data
        expires_delta: Custom expiry time
        
    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + settings.refresh_token_expiry
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": generate_secure_token(16)
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_password_reset_token(user_id: str) -> str:
    """
    Create password reset token
    
    Args:
        user_id: User ID
        
    Returns:
        Encoded reset token
    """
    expire = datetime.utcnow() + timedelta(
        minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    )
    
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "password_reset",
        "purpose": "password_reset"
    }
    
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str, verify_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Decode and verify JWT token
    
    Args:
        token: JWT token string
        verify_type: Optional token type to verify
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": True}
        )
        
        # Verify token type if specified
        if verify_type and payload.get("type") != verify_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type. Expected: {verify_type}"
            )
        
        return payload
        
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except JWTError as e:
        logger.error(f"Token decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )


def verify_token(token: str) -> bool:
    """
    Verify if token is valid
    
    Args:
        token: JWT token
        
    Returns:
        True if valid
    """
    try:
        decode_token(token)
        return True
    except HTTPException:
        return False


# =========================================================================
# AUTHENTICATION DEPENDENCIES
# =========================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None
) -> Dict[str, Any]:
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: Bearer token credentials
        request: FastAPI request object
        
    Returns:
        Current user document
    """
    token = credentials.credentials
    payload = decode_token(token, verify_type="access")
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject"
        )
    
    # Validate ObjectId format
    try:
        ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Check user status
    if user.get("status") == "locked":
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is temporarily locked. Please try again later."
        )
    
    if user.get("status") == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended. Contact administrator."
        )
    
    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Check if password needs change
    if user.get("password_changed_at"):
        password_age = datetime.utcnow() - user["password_changed_at"]
        if password_age.days > settings.PASSWORD_EXPIRY_DAYS:
            # Don't block access, but flag it
            user["password_expired"] = True
    
    # Convert ObjectId to string
    user["_id"] = str(user["_id"])
    
    return user


async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current active user (alias for get_current_user)
    """
    return current_user


def require_role(*roles: str):
    """
    Dependency factory for role-based access control
    
    Args:
        *roles: Required role(s) to access the endpoint
        
    Returns:
        Dependency function
        
    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("admin"))])
    """
    async def role_checker(
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        user_role = current_user.get("role")
        
        if user_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role(s): {', '.join(roles)}"
            )
        
        return current_user
    
    return role_checker


def require_permission(*permissions: str):
    """
    Dependency factory for permission-based access control
    
    Args:
        *permissions: Required permission(s)
        
    Returns:
        Dependency function
    """
    async def permission_checker(
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        user_permissions = current_user.get("permissions", [])
        
        # Admin has all permissions
        if "*" in user_permissions or current_user.get("role") == "admin":
            return current_user
        
        # Check specific permissions
        for perm in permissions:
            if perm not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {perm}"
                )
        
        return current_user
    
    return permission_checker


# =========================================================================
# SECURITY MIDDLEWARE HELPERS
# =========================================================================

def get_client_ip(request: Request) -> str:
    """
    Get client IP address from request
    
    Args:
        request: FastAPI request
        
    Returns:
        Client IP address
    """
    # Check for proxy headers
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"


def generate_api_key() -> str:
    """
    Generate API key for external integrations
    
    Returns:
        API key string
    """
    prefix = "hns"
    random_part = secrets.token_hex(24)
    return f"{prefix}_{random_part}"


def verify_api_key(api_key: str, stored_hash: str) -> bool:
    """
    Verify API key against stored hash
    
    Args:
        api_key: Provided API key
        stored_hash: Stored hash to compare
        
    Returns:
        True if valid
    """
    return verify_password(api_key, stored_hash)


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
        
        Args:
            key: Unique key (e.g., IP address)
            max_requests: Max requests in window
            window_seconds: Time window in seconds
            
        Returns:
            True if rate limited
        """
        if not settings.RATE_LIMIT_ENABLED:
            return False
        
        max_req = max_requests or settings.RATE_LIMIT_REQUESTS
        window = window_seconds or settings.RATE_LIMIT_WINDOW_SECONDS
        
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window)
        
        # Clean old entries
        if key in cls._requests:
            cls._requests[key] = [
                t for t in cls._requests[key] if t > window_start
            ]
        else:
            cls._requests[key] = []
        
        # Check limit
        if len(cls._requests[key]) >= max_req:
            return True
        
        # Add current request
        cls._requests[key].append(now)
        return False
    
    @classmethod
    def get_remaining(cls, key: str) -> int:
        """Get remaining requests"""
        max_req = settings.RATE_LIMIT_REQUESTS
        return max(0, max_req - len(cls._requests.get(key, [])))
    
    @classmethod
    def reset(cls, key: str):
        """Reset rate limit for key"""
        if key in cls._requests:
            del cls._requests[key]