"""Users API - Simplified"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from typing import Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.common import SuccessResponse

router = APIRouter()

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
    users = await db.users.find(filter_query, {"password_hash": 0}).skip(skip).limit(limit).to_list(length=limit)
    for u in users: u["_id"] = str(u["_id"])
    
    return SuccessResponse(success=True, message="Users retrieved", data={"users": users, "total": total})

@router.get("/{user_id}", response_model=SuccessResponse)
async def get_user(user_id: str = Path(...), current_user: Dict[str, Any] = Depends(require_role("admin"))):
    """Get user"""
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])
    return SuccessResponse(success=True, message="User retrieved", data=user)

@router.post("/", response_model=SuccessResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create user"""
    db = get_database()
    from app.models.user import UserModel
    success, message, user = await UserModel.create_user(
        db=db, email=user_data.email, password=user_data.password,
        first_name=user_data.first_name, last_name=user_data.last_name,
        role=user_data.role, phone_number=user_data.phone_number,
        created_by=current_user["_id"]
    )
    if not success: raise HTTPException(status_code=400, detail=message)
    return SuccessResponse(success=True, message=message, data=user)
