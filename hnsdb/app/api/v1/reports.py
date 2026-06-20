"""Reports API"""
from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any
from app.core.security import get_current_user
from app.core.database import get_database
from app.schemas.common import SuccessResponse

router = APIRouter()

@router.get("/", response_model=SuccessResponse)
async def reports_overview(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Reports overview"""
    return SuccessResponse(success=True, message="Reports ready", data={"available": ["academic", "attendance", "financial", "enrollment", "annual"]})

@router.get("/enrollment/summary", response_model=SuccessResponse)
async def enrollment_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Enrollment summary"""
    db = get_database()
    total = await db.students.count_documents({"status": "active"})
    by_gender = await db.students.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$gender", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    return SuccessResponse(success=True, message="Enrollment summary", data={
        "total_active": total,
        "by_gender": {item["_id"]: item["count"] for item in by_gender}
    })

@router.get("/staff/summary", response_model=SuccessResponse)
async def staff_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Staff summary"""
    db = get_database()
    teachers = await db.teachers.count_documents({"status": "active"})
    staff = await db.users.count_documents({"status": "active"})
    return SuccessResponse(success=True, message="Staff summary", data={
        "total_teachers": teachers, "total_staff": staff
    })
