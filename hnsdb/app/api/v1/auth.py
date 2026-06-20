"""Auth API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field

from app.core.security import (
    get_current_user,
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
    RateLimiter,
    get_client_ip
)
from app.core.database import get_database
from app.schemas.user import UserLogin
from app.schemas.common import SuccessResponse

router = APIRouter()


# =========================================================================
# SCHEMAS
# =========================================================================
class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_new_password: str = Field(..., min_length=8)


class UpdateProfileRequest(BaseModel):
    first_name: str = None
    last_name: str = None
    phone_number: str = None


# =========================================================================
# ENDPOINTS
# =========================================================================

@router.post("/login", response_model=SuccessResponse)
async def login(request: UserLogin, req: Request):
    """Login with email and password"""
    try:
        db = get_database()
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")

    email = request.email.lower().strip()
    ip = get_client_ip(req)

    # Rate limiting
    try:
        RateLimiter.check_login_limit(ip=ip, email=email)
    except HTTPException as e:
        raise e

    # Find user
    user = await db.users.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account is inactive")

    if not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])

    access_token = create_access_token({
        "sub": user_id, "email": user["email"], "role": user["role"]
    })
    refresh_token = create_refresh_token({
        "sub": user_id, "email": user["email"], "role": user["role"]
    })

    # Update last login
    try:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"last_login": datetime.utcnow()}}
        )
    except Exception:
        pass

    return SuccessResponse(
        success=True, message="Login successful",
        data={
            "access_token": access_token, "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user_id, "email": user["email"],
                "first_name": user.get("first_name", ""),
                "last_name": user.get("last_name", ""),
                "role": user["role"]
            }
        }
    )


@router.get("/me", response_model=SuccessResponse)
async def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current authenticated user"""
    return SuccessResponse(success=True, message="Profile retrieved", data=current_user)


@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout current user"""
    return SuccessResponse(success=True, message="Logged out successfully")


@router.get("/verify", response_model=SuccessResponse)
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Verify token is valid"""
    return SuccessResponse(success=True, message="Token is valid", data={"user_id": current_user.get("_id")})


@router.put("/me", response_model=SuccessResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update current user profile"""
    db = get_database()

    update_data = {}
    if request.first_name:
        update_data["first_name"] = request.first_name.strip().title()
    if request.last_name:
        update_data["last_name"] = request.last_name.strip().title()
    if request.phone_number:
        update_data["phone_number"] = request.phone_number

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.utcnow()

    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )

    return SuccessResponse(success=True, message="Profile updated", data=update_data)


@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Change current user password"""
    db = get_database()

    # Validate
    if request.new_password != request.confirm_new_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Find user
    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    if not verify_password(request.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Hash new password
    new_hash = get_password_hash(request.new_password)

    # Update
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.utcnow()}}
    )

    return SuccessResponse(success=True, message="Password changed successfully")
