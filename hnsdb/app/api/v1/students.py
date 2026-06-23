"""Students API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path, Request
from typing import Optional, Dict, Any, List
from datetime import date, datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.student import StudentCreate, StudentUpdate
from app.schemas.common import SuccessResponse
from app.utils.helpers import parse_mongo_document

router = APIRouter()


@router.get("", response_model=SuccessResponse)
@router.get("/", response_model=SuccessResponse)
async def list_students(
    class_id: Optional[str] = Query(None),
    status: str = Query(default="active"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List students with filters"""
    db = get_database()
    filter_query = {}
    if class_id: filter_query["current_class_id"] = ObjectId(class_id)
    if status: filter_query["status"] = status
    if search:
        filter_query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"student_id_number": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    total = await db.students.count_documents(filter_query)
    students = await db.students.find(filter_query).sort("last_name", 1).skip(skip).limit(limit).to_list(length=limit)
    
    # Convert all ObjectIds to strings and add class names
    for s in students:
        s = parse_mongo_document(s)
        if s.get("current_class_id"):
            try:
                cls = await db.classes.find_one({"_id": ObjectId(s["current_class_id"])})
                if cls: s["class_name"] = cls.get("class_name", "")
            except Exception:
                s["class_name"] = "Unknown"
    
    return SuccessResponse(success=True, message="Students retrieved", data={
        "students": students, "total": total, "page": page, "limit": limit
    })


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
        "total_active": total,
        "by_gender": {item["_id"]: item["count"] for item in by_gender},
        "by_type": {item["_id"]: item["count"] for item in by_type}
    })


@router.get("/{student_id}", response_model=SuccessResponse)
async def get_student(
    student_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get student details"""
    db = get_database()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    
    # Convert all ObjectIds to strings
    student = parse_mongo_document(student)
    
    if student.get("current_class_id"):
        try:
            cls = await db.classes.find_one({"_id": ObjectId(student["current_class_id"])})
            if cls: student["class_name"] = cls.get("class_name", "")
        except Exception:
            student["class_name"] = "Unknown"
    
    return SuccessResponse(success=True, message="Student retrieved", data=student)


@router.post("", response_model=SuccessResponse, status_code=201)
@router.post("/", response_model=SuccessResponse, status_code=201)
async def create_student(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create student - accepts raw JSON for flexibility"""
    db = get_database()
    from app.models.student import StudentModel
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    first_name = (body.get('first_name', '') or '').strip()
    last_name = (body.get('last_name', '') or '').strip()
    
    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="First name and last name are required")
    
    dob_str = body.get('date_of_birth', '')
    try:
        date_of_birth = datetime.strptime(dob_str, '%Y-%m-%d').date() if dob_str else date.today()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    enroll_str = body.get('enrollment_date', '')
    enrollment_date = None
    if enroll_str:
        try:
            enrollment_date = datetime.strptime(enroll_str, '%Y-%m-%d').date()
        except ValueError:
            enrollment_date = date.today()
    
    success, message, result = await StudentModel.create_student(
        db=db,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=date_of_birth,
        gender=body.get('gender', 'Male'),
        student_type=body.get('student_type', 'other'),
        current_class_id=body.get('current_class_id'),
        middle_name=body.get('middle_name'),
        place_of_birth=body.get('place_of_birth'),
        nationality=body.get('nationality', 'South Sudanese'),
        enrollment_date=enrollment_date,
        medical_notes=body.get('medical_notes'),
        special_needs=body.get('special_needs'),
        address=body.get('address'),
        created_by=current_user["_id"],
        photo_url=body.get('photo_url')
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    guardians = body.get('guardians', [])
    if guardians and result:
        for guardian in guardians:
            try:
                await StudentModel.add_guardian(
                    db=db,
                    student_id=result["_id"],
                    first_name=guardian.get('first_name', ''),
                    last_name=guardian.get('last_name', ''),
                    relationship=guardian.get('relationship', ''),
                    phone_number=guardian.get('phone_number', ''),
                    email=guardian.get('email'),
                    address=guardian.get('address'),
                    occupation=guardian.get('occupation'),
                    is_primary=guardian.get('is_primary_contact', False)
                )
            except Exception:
                pass
    
    updated = await db.students.find_one({"_id": ObjectId(result["_id"])})
    if updated:
        updated = parse_mongo_document(updated)
        result = updated
    
    return SuccessResponse(success=True, message=message, data=result)


@router.put("/{student_id}", response_model=SuccessResponse)
async def update_student(
    student_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update student"""
    db = get_database()
    from app.models.student import StudentModel
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    for key in ['_id', 'student_id_number', 'created_at', 'created_by']:
        body.pop(key, None)
    
    success, message, result = await StudentModel.update_student(
        db=db, student_id=student_id, update_data=body, updated_by=current_user["_id"]
    )
    
    if not success: raise HTTPException(status_code=400, detail=message)
    
    # Parse result to convert ObjectIds
    if result:
        result = parse_mongo_document(result)
    
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
        update_data={"status": "inactive", "status_reason": reason or "Deactivated by admin"},
        updated_by=current_user["_id"]
    )
    if not success: raise HTTPException(status_code=404, detail="Student not found")
    return SuccessResponse(success=True, message="Student deactivated")
