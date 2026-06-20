"""Students API"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from typing import Optional, Dict, Any
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.student import StudentCreate
from app.schemas.common import SuccessResponse

router = APIRouter()

@router.get("/", response_model=SuccessResponse)
async def list_students(
    class_id: Optional[str] = Query(None),
    status: str = Query(default="active"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List students"""
    db = get_database()
    filter_query = {}
    if class_id: filter_query["current_class_id"] = ObjectId(class_id)
    if status: filter_query["status"] = status
    if search:
        filter_query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    total = await db.students.count_documents(filter_query)
    students = await db.students.find(filter_query).skip(skip).limit(limit).to_list(length=limit)
    for s in students:
        s["_id"] = str(s["_id"])
        if s.get("current_class_id"): s["current_class_id"] = str(s["current_class_id"])
    return SuccessResponse(success=True, message="Students retrieved", data={"students": students, "total": total, "page": page, "limit": limit})

@router.get("/{student_id}", response_model=SuccessResponse)
async def get_student(student_id: str = Path(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get student details"""
    db = get_database()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    student["_id"] = str(student["_id"])
    if student.get("current_class_id"): student["current_class_id"] = str(student["current_class_id"])
    return SuccessResponse(success=True, message="Student retrieved", data=student)

@router.post("/", response_model=SuccessResponse, status_code=201)
async def create_student(student: StudentCreate = Body(...), current_user: Dict[str, Any] = Depends(require_role("admin"))):
    """Create student"""
    db = get_database()
    from app.models.student import StudentModel
    success, message, result = await StudentModel.create_student(
        db=db, first_name=student.first_name, last_name=student.last_name,
        date_of_birth=student.date_of_birth, gender=student.gender,
        student_type=student.student_type, current_class_id=student.current_class_id,
        created_by=current_user["_id"]
    )
    if not success: raise HTTPException(status_code=400, detail=message)
    return SuccessResponse(success=True, message=message, data=result)
