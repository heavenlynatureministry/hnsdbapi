"""Auth API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from typing import Dict, Any, Optional, List
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr

from app.core.security import (
    get_current_user,
    require_role,
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
from app.utils.helpers import parse_mongo_document

router = APIRouter()


# =========================================================================
# SCHEMAS
# =========================================================================
class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_new_password: str = Field(..., min_length=8)


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None


class CreateUserRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1)
    phone_number: Optional[str] = None
    status: str = Field(default="active")


class UpdateUserRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    phone_number: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None


# =========================================================================
# ROLE PERMISSIONS
# =========================================================================
def get_default_permissions(role: str) -> List[str]:
    """Get default permissions based on role"""
    permissions_map = {
        "admin": [
            "manage_users", "manage_students", "manage_teachers",
            "manage_classes", "manage_finances", "manage_exams",
            "manage_attendance", "manage_events", "manage_settings",
            "view_reports", "export_data", "manage_board",
            "manage_subjects", "manage_schedule"
        ],
        "teacher": [
            "view_students", "manage_attendance", "manage_exams",
            "view_classes", "view_events", "view_schedule",
            "manage_results"
        ],
        "accountant": [
            "manage_finances", "view_students", "view_reports",
            "export_data", "view_classes", "manage_fees",
            "manage_payments", "view_transactions"
        ],
        "counselor": [
            "view_students", "view_attendance", "view_exams",
            "view_reports", "view_events", "manage_counseling"
        ],
        "secretary": [
            "view_students", "manage_students", "view_classes",
            "manage_attendance", "view_events", "manage_events",
            "view_reports", "manage_enrollment"
        ],
        "staff": [
            "view_students", "view_events", "view_attendance"
        ],
        "librarian": [
            "view_students", "manage_books", "view_events"
        ]
    }
    return permissions_map.get(role.lower(), ["view_students"])


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
        raise HTTPException(status_code=403, detail="Account is inactive. Contact administrator.")

    # Check if account is locked
    if user.get("is_locked", False):
        raise HTTPException(status_code=403, detail="Account is locked due to too many failed attempts. Contact administrator.")

    # Try both password field names for compatibility
    password_hash = user.get("password_hash") or user.get("password") or ""
    
    if not verify_password(request.password, password_hash):
        # Increment failed login attempts
        attempts = user.get("login_attempts", 0) + 1
        update_data = {
            "login_attempts": attempts,
            "updated_at": datetime.utcnow()
        }
        if attempts >= 5:
            update_data["is_locked"] = True
        
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": update_data}
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])

    # Get user's full name for token
    full_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    role = user.get("role", "staff")

    access_token = create_access_token({
        "sub": user_id, 
        "email": user["email"], 
        "role": role,
        "name": full_name
    })
    refresh_token = create_refresh_token({
        "sub": user_id, 
        "email": user["email"], 
        "role": role
    })

    # Update last login and reset attempts
    try:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "last_login": datetime.utcnow(),
                "login_attempts": 0,
                "is_locked": False,
                "updated_at": datetime.utcnow()
            }}
        )
    except Exception:
        pass

    return SuccessResponse(
        success=True, message="Login successful",
        data={
            "access_token": access_token, 
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user_id, 
                "email": user["email"],
                "first_name": user.get("first_name", ""),
                "last_name": user.get("last_name", ""),
                "role": role,
                "phone_number": user.get("phone_number", ""),
                "permissions": user.get("permissions", [])
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


@router.get("/verify", response_model=SuccessResponse)
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Verify token is valid"""
    return SuccessResponse(
        success=True, 
        message="Token is valid", 
        data={"user_id": current_user.get("_id")}
    )


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
        update_data["phone_number"] = request.phone_number.strip()

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.utcnow()

    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )

    return SuccessResponse(
        success=True, 
        message="Profile updated", 
        data=update_data
    )


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

    # Try both password field names
    password_hash = user.get("password_hash") or user.get("password") or ""

    # Verify current password
    if not verify_password(request.current_password, password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Hash new password
    new_hash = get_password_hash(request.new_password)

    # Update - save to both field names for compatibility
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {
            "password_hash": new_hash,
            "password": new_hash,  # Save to both fields
            "updated_at": datetime.utcnow()
        }}
    )

    return SuccessResponse(success=True, message="Password changed successfully")


# =========================================================================
# USER MANAGEMENT (ADMIN ONLY)
# =========================================================================

@router.post("/users", response_model=SuccessResponse)
async def create_user(
    request: CreateUserRequest,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create a new user (Admin only)"""
    db = get_database()

    email = request.email.lower().strip()
    role = request.role.lower().strip()

    # Validate role
    valid_roles = ["admin", "teacher", "accountant", "counselor", "secretary", "staff", "librarian"]
    if role not in valid_roles:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"User with email {email} already exists"
        )

    # Hash password
    hashed_password = get_password_hash(request.password)

    # Get default permissions for role
    permissions = get_default_permissions(role)

    # Create user document
    user_doc = {
        "email": email,
        "password_hash": hashed_password,
        "password": hashed_password,  # Save to both fields for compatibility
        "first_name": request.first_name.strip().title(),
        "last_name": request.last_name.strip().title(),
        "role": role,
        "status": request.status or "active",
        "phone_number": request.phone_number or "",
        "permissions": permissions,
        "login_attempts": 0,
        "is_locked": False,
        "last_login": None,
        "created_by": current_user.get("_id"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    try:
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = str(result.inserted_id)
        
        # Return user without password
        user_response = {
            "id": user_doc["_id"],
            "email": user_doc["email"],
            "first_name": user_doc["first_name"],
            "last_name": user_doc["last_name"],
            "role": user_doc["role"],
            "status": user_doc["status"],
            "phone_number": user_doc["phone_number"],
            "permissions": user_doc["permissions"],
            "created_at": str(user_doc["created_at"])
        }

        return SuccessResponse(
            success=True,
            message=f"User {request.first_name} {request.last_name} created successfully",
            data=user_response
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create user: {str(e)}"
        )


@router.get("/users", response_model=SuccessResponse)
async def list_users(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(default="active"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """List all users (Admin only)"""
    db = get_database()

    # Build filter
    filter_query = {}
    if role:
        filter_query["role"] = role
    if status:
        filter_query["status"] = status
    if search:
        filter_query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]

    skip = (page - 1) * limit
    total = await db.users.count_documents(filter_query)
    
    users = await db.users.find(filter_query)\
        .sort("created_at", -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(length=limit)

    # Remove passwords from response
    users_list = []
    for user in users:
        user = parse_mongo_document(user)
        user.pop("password_hash", None)
        user.pop("password", None)
        user["id"] = user.get("_id")
        users_list.append(user)

    return SuccessResponse(
        success=True,
        message="Users retrieved",
        data={
            "users": users_list,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    )


@router.get("/users/{user_id}", response_model=SuccessResponse)
async def get_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Get user by ID (Admin only)"""
    db = get_database()

    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user = parse_mongo_document(user)
    user.pop("password_hash", None)
    user.pop("password", None)
    user["id"] = user.get("_id")

    return SuccessResponse(
        success=True,
        message="User retrieved",
        data=user
    )


@router.put("/users/{user_id}", response_model=SuccessResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update user (Admin only)"""
    db = get_database()

    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Check if user exists
    existing = await db.users.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    # Build update data
    update_data = {}
    
    if request.first_name:
        update_data["first_name"] = request.first_name.strip().title()
    if request.last_name:
        update_data["last_name"] = request.last_name.strip().title()
    if request.email:
        # Check if email is already taken
        email_check = await db.users.find_one({
            "email": request.email.lower().strip(),
            "_id": {"$ne": obj_id}
        })
        if email_check:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = request.email.lower().strip()
    if request.role:
        valid_roles = ["admin", "teacher", "accountant", "counselor", "secretary", "staff", "librarian"]
        if request.role.lower() not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        update_data["role"] = request.role.lower()
        # Update permissions when role changes
        update_data["permissions"] = get_default_permissions(request.role.lower())
    if request.phone_number is not None:
        update_data["phone_number"] = request.phone_number.strip()
    if request.status:
        update_data["status"] = request.status
    if request.password:
        hashed = get_password_hash(request.password)
        update_data["password_hash"] = hashed
        update_data["password"] = hashed  # Update both fields
        # Reset login attempts on password change
        update_data["login_attempts"] = 0
        update_data["is_locked"] = False

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.utcnow()

    await db.users.update_one(
        {"_id": obj_id},
        {"$set": update_data}
    )

    return SuccessResponse(
        success=True,
        message="User updated successfully",
        data=update_data
    )


@router.delete("/users/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete/deactivate user (Admin only)"""
    db = get_database()

    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Prevent deleting yourself
    if str(obj_id) == str(current_user.get("_id")):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Soft delete - mark as inactive
    result = await db.users.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": "inactive",
            "updated_at": datetime.utcnow()
        }}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return SuccessResponse(
        success=True,
        message="User deactivated successfully"
    )


@router.post("/users/{user_id}/reset-password", response_model=SuccessResponse)
async def reset_user_password(
    user_id: str,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Reset user password to default (Admin only)"""
    db = get_database()

    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Default password
    default_password = "changeme123"
    hashed = get_password_hash(default_password)

    result = await db.users.update_one(
        {"_id": obj_id},
        {"$set": {
            "password_hash": hashed,
            "password": hashed,
            "login_attempts": 0,
            "is_locked": False,
            "updated_at": datetime.utcnow()
        }}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return SuccessResponse(
        success=True,
        message=f"Password reset to: {default_password}"
    )


@router.get("/roles", response_model=SuccessResponse)
async def get_available_roles(
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Get available roles and their permissions"""
    roles = [
        {
            "role": "admin",
            "label": "Administrator",
            "description": "Full system access",
            "permissions": get_default_permissions("admin")
        },
        {
            "role": "teacher",
            "label": "Teacher",
            "description": "Class and exam management",
            "permissions": get_default_permissions("teacher")
        },
        {
            "role": "accountant",
            "label": "Accountant",
            "description": "Financial management",
            "permissions": get_default_permissions("accountant")
        },
        {
            "role": "counselor",
            "label": "Counselor",
            "description": "Student counseling and guidance",
            "permissions": get_default_permissions("counselor")
        },
        {
            "role": "secretary",
            "label": "Secretary",
            "description": "Student enrollment and records",
            "permissions": get_default_permissions("secretary")
        },
        {
            "role": "staff",
            "label": "General Staff",
            "description": "Basic access",
            "permissions": get_default_permissions("staff")
        },
        {
            "role": "librarian",
            "label": "Librarian",
            "description": "Library management",
            "permissions": get_default_permissions("librarian")
        }
    ]

    return SuccessResponse(
        success=True,
        message="Roles retrieved",
        data=roles
    )
