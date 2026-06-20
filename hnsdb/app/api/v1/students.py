"""Students API"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from typing import Optional, Dict, Any, List
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.student import StudentCreate, StudentUpdate
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
async def create_student(
    student: StudentCreate = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create student with optional guardians"""
    db = get_database()
    from app.models.student import StudentModel
    
    # Extract guardian data before creating student
    guardians_data = student.guardians or []
    
    # Create student with basic fields
    success, message, result = await StudentModel.create_student(
        db=db,
        first_name=student.first_name,
        last_name=student.last_name,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        student_type=student.student_type,
        current_class_id=student.current_class_id,
        middle_name=student.middle_name,
        place_of_birth=student.place_of_birth,
        nationality=student.nationality,
        enrollment_date=student.enrollment_date,
        medical_notes=student.medical_notes,
        special_needs=student.special_needs,
        address=student.address,
        created_by=current_user["_id"],
        photo_url=student.photo_url
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # Add guardians if provided
    if guardians_data and result:
        for guardian in guardians_data:
            try:
                await StudentModel.add_guardian(
                    db=db,
                    student_id=result["_id"],
                    first_name=guardian.first_name,
                    last_name=guardian.last_name,
                    relationship=guardian.relationship,
                    phone_number=guardian.phone_number,
                    email=guardian.email,
                    address=guardian.address,
                    occupation=guardian.occupation,
                    is_primary=guardian.is_primary_contact
                )
            except Exception as e:
                pass  # Don't fail if guardian add fails
    
    # Return updated student with guardians
    updated_student = await db.students.find_one({"_id": ObjectId(result["_id"])})
    if updated_student:
        updated_student["_id"] = str(updated_student["_id"])
        if updated_student.get("current_class_id"):
            updated_student["current_class_id"] = str(updated_student["current_class_id"])
        result = updated_student
    
    return SuccessResponse(success=True, message=message, data=result)

@router.put("/{student_id}", response_model=SuccessResponse)
async def update_student(
    student_id: str = Path(...),
    student: StudentUpdate = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update student"""
    db = get_database()
    from app.models.student import StudentModel
    
    update_data = {k: v for k, v in student.dict(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    success, message, result = await StudentModel.update_student(
        db=db, student_id=student_id, update_data=update_data, updated_by=current_user["_id"]
    )
    
    if not success: raise HTTPException(status_code=400, detail=message)
    return SuccessResponse(success=True, message=message, data=result)

@router.delete("/{student_id}", response_model=SuccessResponse)
async def deactivate_student(
    student_id: str = Path(...),
    reason: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Deactivate student"""
    db = get_database()
    from app.models.student import StudentModel
    success, message, _ = await StudentModel.update_student(
        db=db, student_id=student_id,
        update_data={"status": "inactive", "status_reason": reason or "Deactivated"},
        updated_by=current_user["_id"]
    )
    if not success: raise HTTPException(status_code=404, detail="Student not found")
    return SuccessResponse(success=True, message="Student deactivated")

@router.get("/statistics/overview", response_model=SuccessResponse)
async def student_statistics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get student statistics"""
    db = get_database()
    total = await db.students.count_documents({"status": "active"})
    by_gender = await db.students.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$gender", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    by_type = await db.students.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$student_type", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    
    return SuccessResponse(success=True, message="Statistics retrieved", data={
        "total_students": total,
        "by_gender": {item["_id"]: item["count"] for item in by_gender},
        "by_type": {item["_id"]: item["count"] for item in by_type}
    })
