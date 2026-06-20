"""Auth API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from datetime import datetime

from app.core.security import get_current_user, require_role, create_access_token, create_refresh_token
from app.core.database import get_database
from app.services.auth_service import AuthService
from app.schemas.user import UserLogin, ChangePasswordRequest
from app.schemas.common import SuccessResponse

router = APIRouter()


@router.post("/login", response_model=SuccessResponse)
async def login(request: UserLogin):
    """Authenticate user and return tokens"""
    try:
        db = get_database()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is temporarily unavailable. Please try again."
        )

    # Authenticate user
    user = await AuthService.authenticate_user(db, request.email, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check if user is active
    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact administrator."
        )

    # Generate tokens
    access_token = create_access_token({
        "sub": user["_id"],
        "email": user["email"],
        "role": user["role"]
    })
    refresh_token = create_refresh_token({
        "sub": user["_id"],
        "email": user["email"],
        "role": user["role"]
    })

    # Update last login
    try:
        from bson import ObjectId
        await db.users.update_one(
            {"_id": ObjectId(user["_id"])},
            {"$set": {"last_login": datetime.utcnow()}}
        )
    except Exception:
        pass  # Don't fail login if update fails

    return SuccessResponse(
        success=True,
        message="Login successful",
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user["_id"],
                "email": user["email"],
                "first_name": user.get("first_name", ""),
                "last_name": user.get("last_name", ""),
                "role": user["role"],
                "status": user.get("status", "active")
            }
        }
    )


@router.get("/me", response_model=SuccessResponse)
async def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current authenticated user"""
    return SuccessResponse(
        success=True,
        message="Profile retrieved",
        data={
            "id": current_user.get("_id"),
            "email": current_user.get("email"),
            "first_name": current_user.get("first_name", ""),
            "last_name": current_user.get("last_name", ""),
            "role": current_user.get("role"),
            "status": current_user.get("status", "active"),
            "permissions": current_user.get("permissions", [])
        }
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout current user"""
    return SuccessResponse(success=True, message="Logged out successfully")


@router.get("/verify", response_model=SuccessResponse)
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Verify token is valid"""
    return SuccessResponse(
        success=True,
        message="Token is valid",
        data={"user_id": current_user.get("_id")}
    )


@router.get("/health", response_model=SuccessResponse)
async def auth_health():
    """Auth endpoint health check"""
    try:
        db = get_database()
        await db.command("ping")
        return SuccessResponse(success=True, message="Auth service is healthy")
    except Exception as e:
        return SuccessResponse(success=False, message=f"Auth service degraded: {str(e)}")
