"""Auth API - Simplified"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Optional, Dict, Any
from datetime import datetime

from app.core.security import get_current_user, require_role, create_access_token, create_refresh_token
from app.core.database import get_database
from app.services.auth_service import AuthService
from app.schemas.user import UserLogin, TokenResponse, ChangePasswordRequest
from app.schemas.common import SuccessResponse

router = APIRouter()

@router.post("/login", response_model=SuccessResponse)
async def login(request: UserLogin):
    """Login"""
    db = get_database()
    user = await AuthService.authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": user["_id"], "email": user["email"], "role": user["role"]})
    refresh_token = create_refresh_token({"sub": user["_id"], "email": user["email"], "role": user["role"]})
    
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
                "role": user["role"]
            }
        }
    )

@router.get("/me", response_model=SuccessResponse)
async def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user"""
    return SuccessResponse(success=True, message="Profile retrieved", data=current_user)

@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout"""
    return SuccessResponse(success=True, message="Logged out")
