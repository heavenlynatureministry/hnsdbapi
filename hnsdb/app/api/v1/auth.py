"""Auth API - Self Contained (No AuthService)"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from datetime import datetime
from bson import ObjectId

from app.core.security import get_current_user, create_access_token, create_refresh_token, verify_password
from app.core.database import get_database
from app.schemas.user import UserLogin
from app.schemas.common import SuccessResponse

router = APIRouter()


@router.post("/login", response_model=SuccessResponse)
async def login(request: UserLogin):
    """
    Login with email and password.
    
    Try: admin@school.com / Admin@2024!
    """
    # Get database
    try:
        db = get_database()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {str(e)}")

    email = request.email.lower().strip()
    
    # Find user
    user = await db.users.find_one({"email": email})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check status
    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Verify password
    password_valid = verify_password(request.password, user.get("password_hash", ""))
    
    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Convert ID to string
    user_id = str(user["_id"])

    # Create tokens
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

    # Update last login (don't fail if this errors)
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
        data=current_user
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout current user"""
    return SuccessResponse(success=True, message="Logged out successfully")
