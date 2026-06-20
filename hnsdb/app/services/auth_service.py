"""
Authentication Service
Handles user authentication, token management, and password operations
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import re

from app.core.security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    create_refresh_token
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service with enhanced security features"""
    
    # Maximum login attempts before account lockout
    MAX_LOGIN_ATTEMPTS = 5
    # Lockout duration in minutes
    LOCKOUT_DURATION = 30
    
    @staticmethod
    async def authenticate_user(
        db: AsyncIOMotorDatabase, 
        email: str, 
        password: str,
        ip_address: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Authenticate user with email and password
        
        Args:
            db: Database connection
            email: User email
            password: Plain text password
            ip_address: Optional IP address for audit
            
        Returns:
            User document if authenticated, None otherwise
        """
        email = email.lower().strip()
        
        # Find user
        user = await db.users.find_one({"email": email})
        
        if not user:
            # Use constant-time comparison to prevent timing attacks
            get_password_hash("dummy_password")
            logger.warning(f"Login attempt for non-existent user: {email}")
            return None
        
        # Check if account is locked
        if user.get("locked_until") and user["locked_until"] > datetime.utcnow():
            logger.warning(f"Login attempt on locked account: {email}")
            raise Exception("Account is temporarily locked. Please try again later.")
        
        # Check if user is active
        if user.get("status") != "active":
            logger.warning(f"Inactive user login attempt: {email}")
            
            # Provide specific message for different statuses
            if user.get("status") == "suspended":
                raise Exception("Account has been suspended. Please contact administrator.")
            elif user.get("status") == "deleted":
                raise Exception("Account has been deleted.")
            else:
                raise Exception("Account is inactive. Please contact administrator.")
        
        # Verify password
        if not verify_password(password, user["password_hash"]):
            # Increment login attempts
            attempts = user.get("login_attempts", 0) + 1
            
            update_data = {
                "$set": {"login_attempts": attempts},
                "$push": {
                    "login_history": {
                        "timestamp": datetime.utcnow(),
                        "success": False,
                        "ip_address": ip_address
                    }
                }
            }
            
            # Lock account if too many attempts
            if attempts >= AuthService.MAX_LOGIN_ATTEMPTS:
                lockout_until = datetime.utcnow() + timedelta(minutes=AuthService.LOCKOUT_DURATION)
                update_data["$set"]["locked_until"] = lockout_until
                update_data["$set"]["status"] = "locked"
                logger.warning(f"Account locked due to multiple failed attempts: {email}")
            
            await db.users.update_one({"_id": user["_id"]}, update_data)
            return None
        
        # Check if password needs to be changed (older than 90 days)
        password_age = None
        if user.get("password_changed_at"):
            password_age = datetime.utcnow() - user["password_changed_at"]
        
        # Successful login - reset attempts and update last login
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "last_login": datetime.utcnow(),
                    "login_attempts": 0,
                    "locked_until": None,
                    "status": "active" if user.get("status") == "locked" else user.get("status")
                },
                "$push": {
                    "login_history": {
                        "timestamp": datetime.utcnow(),
                        "success": True,
                        "ip_address": ip_address
                    }
                }
            }
        )
        
        # Convert ObjectId to string
        user["_id"] = str(user["_id"])
        user["password_age_days"] = password_age.days if password_age else None
        user["password_expired"] = password_age and password_age.days > 90
        
        return user
    
    @staticmethod
    async def create_tokens(
        user: Dict[str, Any],
        remember_me: bool = False
    ) -> Dict[str, Any]:
        """
        Create access and refresh tokens for user
        
        Args:
            user: User document
            remember_me: Extend token expiry if True
            
        Returns:
            Dictionary with tokens and expiry info
        """
        token_data = {
            "sub": user["_id"],
            "email": user["email"],
            "role": user["role"],
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "permissions": user.get("permissions", [])
        }
        
        # Set expiry based on remember_me
        access_expiry = timedelta(days=7) if remember_me else settings.token_expiry
        refresh_expiry = timedelta(days=30) if remember_me else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        access_token = create_access_token(token_data, expires_delta=access_expiry)
        refresh_token = create_refresh_token(
            {**token_data, "type": "refresh"},
            expires_delta=refresh_expiry
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": int(access_expiry.total_seconds()),
            "user": {
                "id": user["_id"],
                "email": user["email"],
                "first_name": user.get("first_name", ""),
                "last_name": user.get("last_name", ""),
                "role": user["role"],
                "permissions": user.get("permissions", []),
                "password_expired": user.get("password_expired", False),
                "password_age_days": user.get("password_age_days")
            }
        }
    
    @staticmethod
    async def refresh_access_token(
        db: AsyncIOMotorDatabase,
        refresh_token: str
    ) -> Optional[Dict[str, Any]]:
        """
        Refresh access token using refresh token
        
        Args:
            db: Database connection
            refresh_token: Valid refresh token
            
        Returns:
            New tokens or None if invalid
        """
        from jose import jwt, JWTError
        
        try:
            payload = jwt.decode(
                refresh_token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Verify it's a refresh token
            if payload.get("type") != "refresh":
                return None
            
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            # Verify user still exists and is active
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            
            if not user or user.get("status") != "active":
                return None
            
            # Check if password was changed after token was issued
            token_iat = payload.get("iat", 0)
            password_changed = user.get("password_changed_at")
            
            if password_changed and password_changed.timestamp() > token_iat:
                return None  # Token invalidated by password change
            
            user["_id"] = str(user["_id"])
            
            # Create new tokens
            tokens = await AuthService.create_tokens(user)
            
            return tokens
            
        except JWTError as e:
            logger.error(f"Token refresh error: {e}")
            return None
    
    @staticmethod
    async def change_password(
        db: AsyncIOMotorDatabase,
        user_id: str,
        current_password: str,
        new_password: str
    ) -> Tuple[bool, str]:
        """
        Change user password with validation
        
        Args:
            db: Database connection
            user_id: User ID
            current_password: Current password for verification
            new_password: New password
            
        Returns:
            Tuple of (success, message)
        """
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return False, "User not found"
        
        # Verify current password
        if not verify_password(current_password, user["password_hash"]):
            return False, "Current password is incorrect"
        
        # Validate new password strength
        is_valid, message = AuthService._validate_password_strength(new_password)
        if not is_valid:
            return False, message
        
        # Check if new password is same as current
        if verify_password(new_password, user["password_hash"]):
            return False, "New password cannot be the same as current password"
        
        # Check password history (last 5 passwords)
        password_history = user.get("password_history", [])
        for old_hash in password_history[-5:]:
            if verify_password(new_password, old_hash):
                return False, "New password cannot be one of your last 5 passwords"
        
        # Hash new password
        new_hash = get_password_hash(new_password)
        
        # Update password and add to history
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password_hash": new_hash,
                    "password_changed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                },
                "$push": {
                    "password_history": {
                        "$each": [user["password_hash"]],
                        "$slice": -5  # Keep only last 5
                    }
                }
            }
        )
        
        logger.info(f"Password changed for user: {user.get('email')}")
        
        return True, "Password changed successfully"
    
    @staticmethod
    async def reset_password(
        db: AsyncIOMotorDatabase,
        user_id: str,
        new_password: str,
        reset_token: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Reset user password (admin or token-based)
        
        Args:
            db: Database connection
            user_id: User ID
            new_password: New password
            reset_token: Optional reset token for verification
            
        Returns:
            Tuple of (success, message)
        """
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return False, "User not found"
        
        # Validate password strength
        is_valid, message = AuthService._validate_password_strength(new_password)
        if not is_valid:
            return False, message
        
        # Hash new password
        new_hash = get_password_hash(new_password)
        
        # Update password
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password_hash": new_hash,
                    "password_changed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "login_attempts": 0,
                    "locked_until": None,
                    "status": "active" if user.get("status") == "locked" else user.get("status")
                }
            }
        )
        
        logger.info(f"Password reset for user: {user.get('email')}")
        
        return True, "Password reset successfully"
    
    @staticmethod
    async def generate_password_reset_token(
        db: AsyncIOMotorDatabase,
        email: str
    ) -> Optional[Dict[str, Any]]:
        """
        Generate password reset token
        
        Args:
            db: Database connection
            email: User email
            
        Returns:
            Dictionary with reset token and expiry, or None
        """
        user = await db.users.find_one({"email": email.lower().strip()})
        
        if not user:
            return None
        
        # Generate reset token
        reset_token = create_access_token(
            data={
                "sub": str(user["_id"]),
                "purpose": "password_reset"
            },
            expires_delta=timedelta(hours=1)
        )
        
        # Store reset token info
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "reset_token": reset_token,
                    "reset_token_expires": datetime.utcnow() + timedelta(hours=1),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "user_id": str(user["_id"]),
            "email": user["email"],
            "reset_token": reset_token,
            "expires_in": 3600  # 1 hour in seconds
        }
    
    @staticmethod
    async def validate_reset_token(
        db: AsyncIOMotorDatabase,
        token: str
    ) -> Optional[str]:
        """
        Validate password reset token
        
        Args:
            db: Database connection
            token: Reset token
            
        Returns:
            User ID if valid, None otherwise
        """
        from jose import jwt, JWTError
        
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            if payload.get("purpose") != "password_reset":
                return None
            
            user_id = payload.get("sub")
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            
            if not user:
                return None
            
            # Check if token matches stored token
            if user.get("reset_token") != token:
                return None
            
            # Check if token expired
            if user.get("reset_token_expires", datetime.min) < datetime.utcnow():
                return None
            
            return user_id
            
        except JWTError:
            return None
    
    @staticmethod
    def _validate_password_strength(password: str) -> Tuple[bool, str]:
        """
        Validate password strength
        
        Args:
            password: Password to validate
            
        Returns:
            Tuple of (is_valid, message)
        """
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        
        if len(password) > 128:
            return False, "Password must not exceed 128 characters"
        
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        
        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        
        if not re.search(r'\d', password):
            return False, "Password must contain at least one digit"
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False, "Password must contain at least one special character"
        
        # Check for common patterns
        common_patterns = ['123', 'abc', 'password', 'qwerty', 'admin']
        if any(pattern in password.lower() for pattern in common_patterns):
            return False, "Password contains common patterns. Please choose a stronger password"
        
        return True, "Password meets requirements"


async def create_initial_admin(db: AsyncIOMotorDatabase):
    """
    Create initial admin user if not exists
    
    Args:
        db: Database connection
    """
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
        "password_history": [],
        "login_history": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    try:
        await db.users.insert_one(admin_user)
        logger.info(f"Admin user created: {settings.ADMIN_EMAIL}")
    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")