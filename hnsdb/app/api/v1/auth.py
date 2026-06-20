"""Auth API - Self Contained"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any
from datetime import datetime
from bson import ObjectId

from app.core.security import (
    get_current_user,
    create_access_token,
    create_refresh_token,
    verify_password,
    RateLimiter,
    get_client_ip
)
from app.core.database import get_database
from app.schemas.user import UserLogin
from app.schemas.common import SuccessResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()


@router.post("/login", response_model=SuccessResponse)
async def login(
    request: UserLogin,
    req: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Login with email and password (rate limited)"""

    email = request.email.lower().strip()

    # =========================================================
    # 🔐 RATE LIMITING (NEW - BRUTE FORCE PROTECTION)
    # =========================================================
    ip = get_client_ip(req)
    RateLimiter.check_login_limit(ip=ip, email=email)

    user = await db.users.find_one({"email": email})

    if not user:
        # Still trigger limiter on failed attempts
        RateLimiter.check_login_limit(ip=ip, email=email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account is inactive")

    if not verify_password(request.password, user.get("password_hash", "")):
        # Track failed attempt through limiter
        RateLimiter.check_login_limit(ip=ip, email=email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])

    access_token = create_access_token({
        "sub": user_id,
        "email": user["email"],
        "role": user["role"]
    })

    refresh_token = create_refresh_token({
        "sub": user_id,
        "email": user["email"],
        "role": user["role"]
    })

    try:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"last_login": datetime.utcnow()}}
        )
    except Exception:
        pass

    return SuccessResponse(
        success=True,
        message="Login successful",
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": user["email"],
                "first_name": user.get("first_name", ""),
                "last_name": user.get("last_name", ""),
                "role": user["role"]
            }
        }
    )


@router.get("/me", response_model=SuccessResponse)
async def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return SuccessResponse(
        success=True,
        message="Profile retrieved",
        data=current_user
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    return SuccessResponse(
        success=True,
        message="Logged out successfully"
    )
