"""Users API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Request
from typing import Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from app.core.security import get_current_user, require_role, get_password_hash
from app.core.database import get_database
from app.schemas.user import UserCreate
from app.schemas.common import SuccessResponse

router = APIRouter()


@router.get("", response_model=SuccessResponse)
@router.get("/", response_model=SuccessResponse)
async def list_users(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """List users"""
    db = get_database()
    filter_query = {}
    if role: filter_query["role"] = role
    if status: filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.users.count_documents(filter_query)
    users = await db.users.find(filter_query, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    for u in users: u["_id"] = str(u["_id"])
    
    return SuccessResponse(success=True, message="Users retrieved", data={"users": users, "total": total, "page": page, "limit": limit})


@router.get("/roles/list", response_model=SuccessResponse)
async def get_roles(current_user: Dict[str, Any] = Depends(require_role("admin"))):
    """Get available roles"""
    roles = [
        {"role": "admin", "label": "Administrator", "permissions": ["*"]},
        {"role": "teacher", "label": "Teacher", "permissions": ["view_students", "manage_attendance", "manage_exams"]},
        {"role": "accountant", "label": "Accountant", "permissions": ["manage_financial", "view_reports"]},
        {"role": "counselor", "label": "Counselor", "permissions": ["view_students"]},
        {"role": "staff", "label": "Staff", "permissions": ["view_students", "view_reports"]},
    ]
    return SuccessResponse(success=True, message="Roles retrieved", data=roles)


@router.get("/{user_id}", response_model=SuccessResponse)
async def get_user(
    user_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Get user details"""
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])
    return SuccessResponse(success=True, message="User retrieved", data=user)


@router.post("", response_model=SuccessResponse, status_code=201)
@router.post("/", response_model=SuccessResponse, status_code=201)
async def create_user(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create user - accepts raw JSON"""
    db = get_database()
    from app.models.user import UserModel
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    email = (body.get('email', '') or '').strip().lower()
    password = body.get('password', '')
    first_name = (body.get('first_name', '') or '').strip()
    last_name = (body.get('last_name', '') or '').strip()
    role = body.get('role', 'staff')
    
    if not email or not password or not first_name or not last_name:
        raise HTTPException(status_code=400, detail="Email, password, first name, and last name are required")
    
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    success, message, user = await UserModel.create_user(
        db=db,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role,
        phone_number=body.get('phone_number'),
        created_by=current_user["_id"],
        permissions=body.get('permissions')
    )
    
    if not success: raise HTTPException(status_code=400, detail=message)
    return SuccessResponse(success=True, message=message, data=user)


@router.put("/{user_id}", response_model=SuccessResponse)
async def update_user(
    user_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update user"""
    db = get_database()
    from app.models.user import UserModel
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    for key in ['_id', 'password_hash', 'created_at', 'created_by']:
        body.pop(key, None)
    
    success, message, user = await UserModel.update_user(
        db=db, user_id=user_id, update_data=body
    )
    
    if not success: raise HTTPException(status_code=400, detail=message)
    return SuccessResponse(success=True, message=message, data=user)


@router.delete("/{user_id}", response_model=SuccessResponse)
async def deactivate_user(
    user_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Deactivate user"""
    db = get_database()
    from app.models.user import UserModel
    success, message = await UserModel.deactivate_user(db, user_id)
    if not success: raise HTTPException(status_code=404, detail="User not found")
    return SuccessResponse(success=True, message=message)
