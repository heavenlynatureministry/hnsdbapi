"""Teachers API"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from typing import Optional, Dict, Any
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.teacher import TeacherCreate
from app.schemas.common import SuccessResponse

router = APIRouter()

@router.get("/", response_model=SuccessResponse)
async def list_teachers(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List teachers"""
    db = get_database()
    filter_query = {}
    if status: filter_query["status"] = status
    if search:
        filter_query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    total = await db.teachers.count_documents(filter_query)
    teachers = await db.teachers.find(filter_query).skip(skip).limit(limit).to_list(length=limit)
    for t in teachers: t["_id"] = str(t["_id"])
    return SuccessResponse(success=True, message="Teachers retrieved", data={"teachers": teachers, "total": total})

@router.get("/{teacher_id}", response_model=SuccessResponse)
async def get_teacher(teacher_id: str = Path(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get teacher"""
    db = get_database()
    teacher = await db.teachers.find_one({"_id": ObjectId(teacher_id)})
    if not teacher: raise HTTPException(status_code=404, detail="Teacher not found")
    teacher["_id"] = str(teacher["_id"])
    return SuccessResponse(success=True, message="Teacher retrieved", data=teacher)

@router.post("/", response_model=SuccessResponse, status_code=201)
async def create_teacher(teacher: TeacherCreate = Body(...), current_user: Dict[str, Any] = Depends(require_role("admin"))):
    """Create teacher"""
    db = get_database()
    from app.models.teacher import TeacherModel
    success, message, result = await TeacherModel.create_teacher(
        db=db, first_name=teacher.first_name, last_name=teacher.last_name,
        date_of_birth=teacher.date_of_birth, gender=teacher.gender,
        qualification=teacher.qualification, hire_date=teacher.hire_date,
        phone_number=teacher.phone_number, email=teacher.email,
        created_by=current_user["_id"]
    )
    if not success: raise HTTPException(status_code=400, detail=message)
    return SuccessResponse(success=True, message=message, data=result)
