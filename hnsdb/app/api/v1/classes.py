"""Classes API - Simplified"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from typing import Optional, List, Dict, Any
from bson import ObjectId
from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse

router = APIRouter()

@router.get("/", response_model=SuccessResponse)
async def list_classes(
    class_level: Optional[str] = Query(None),
    status: str = Query(default="active"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List classes"""
    db = get_database()
    filter_query = {"status": status}
    if class_level: filter_query["class_level"] = class_level
    skip = (page - 1) * limit
    total = await db.classes.count_documents(filter_query)
    classes = await db.classes.find(filter_query).skip(skip).limit(limit).to_list(length=limit)
    for c in classes: c["_id"] = str(c["_id"])
    return SuccessResponse(success=True, message="Classes retrieved", data={"classes": classes, "total": total})

@router.get("/{class_id}", response_model=SuccessResponse)
async def get_class(class_id: str = Path(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get class"""
    db = get_database()
    class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_doc: raise HTTPException(status_code=404, detail="Class not found")
    class_doc["_id"] = str(class_doc["_id"])
    return SuccessResponse(success=True, message="Class retrieved", data=class_doc)
