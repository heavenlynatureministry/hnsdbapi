"""Teachers API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path, Request
from typing import Optional, Dict, Any
from datetime import date, datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.teacher import TeacherCreate
from app.schemas.common import SuccessResponse

router = APIRouter()


@router.get("", response_model=SuccessResponse)
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
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    total = await db.teachers.count_documents(filter_query)
    teachers = await db.teachers.find(filter_query).sort("last_name", 1).skip(skip).limit(limit).to_list(length=limit)
    for t in teachers: t["_id"] = str(t["_id"])
    return SuccessResponse(success=True, message="Teachers retrieved", data={"teachers": teachers, "total": total, "page": page, "limit": limit})


@router.get("/statistics/overview", response_model=SuccessResponse)
async def teacher_statistics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get teacher statistics"""
    db = get_database()
    total = await db.teachers.count_documents({"status": "active"})
    by_status = await db.teachers.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    by_qualification = await db.teachers.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$qualification", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    
    return SuccessResponse(success=True, message="Statistics retrieved", data={
        "total_active_teachers": total,
        "by_status": {item["_id"]: item["count"] for item in by_status},
        "by_qualification": {item["_id"]: item["count"] for item in by_qualification}
    })


@router.get("/{teacher_id}", response_model=SuccessResponse)
async def get_teacher(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get teacher details"""
    db = get_database()
    teacher = await db.teachers.find_one({"_id": ObjectId(teacher_id)})
    if not teacher: raise HTTPException(status_code=404, detail="Teacher not found")
    teacher["_id"] = str(teacher["_id"])
    if teacher.get("class_teacher_of"): teacher["class_teacher_of"] = str(teacher["class_teacher_of"])
    return SuccessResponse(success=True, message="Teacher retrieved", data=teacher)


@router.post("", response_model=SuccessResponse, status_code=201)
@router.post("/", response_model=SuccessResponse, status_code=201)
async def create_teacher(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create teacher - accepts raw JSON"""
    db = get_database()
    from app.models.teacher import TeacherModel
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    first_name = (body.get('first_name', '') or '').strip()
    last_name = (body.get('last_name', '') or '').strip()
    
    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="First name and last name are required")
    
    dob_str = body.get('date_of_birth', '')
    hire_str = body.get('hire_date', '')
    
    try:
        date_of_birth = datetime.strptime(dob_str, '%Y-%m-%d').date() if dob_str else date.today()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date of birth format. Use YYYY-MM-DD")
    
    try:
        hire_date = datetime.strptime(hire_str, '%Y-%m-%d').date() if hire_str else date.today()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid hire date format. Use YYYY-MM-DD")
    
    success, message, result = await TeacherModel.create_teacher(
        db=db,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=date_of_birth,
        gender=body.get('gender', 'Male'),
        qualification=body.get('qualification', 'Diploma'),
        hire_date=hire_date,
        phone_number=body.get('phone_number', ''),
        email=body.get('email', ''),
        specialization=body.get('specialization'),
        middle_name=body.get('middle_name'),
        nationality=body.get('nationality'),
        subjects=body.get('subjects'),
        address=body.get('address'),
        years_of_experience=body.get('years_of_experience', 0),
        salary_grade=body.get('salary_grade'),
        photo_url=body.get('photo_url'),
        created_by=current_user["_id"]
    )
    
    if not success: raise HTTPException(status_code=400, detail=message)
    return SuccessResponse(success=True, message=message, data=result)


@router.put("/{teacher_id}", response_model=SuccessResponse)
async def update_teacher(
    teacher_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update teacher"""
    db = get_database()
    from app.models.teacher import TeacherModel
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    for key in ['_id', 'employee_id', 'created_at', 'created_by']:
        body.pop(key, None)
    
    success, message, result = await TeacherModel.update_teacher(
        db=db, teacher_id=teacher_id, update_data=body, updated_by=current_user["_id"]
    )
    
    if not success: raise HTTPException(status_code=400, detail=message)
    return SuccessResponse(success=True, message=message, data=result)


@router.delete("/{teacher_id}", response_model=SuccessResponse)
async def deactivate_teacher(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Deactivate teacher"""
    db = get_database()
    from app.models.teacher import TeacherModel
    success, message, _ = await TeacherModel.update_teacher(
        db=db, teacher_id=teacher_id,
        update_data={"status": "inactive"},
        updated_by=current_user["_id"]
    )
    if not success: raise HTTPException(status_code=404, detail="Teacher not found")
    return SuccessResponse(success=True, message="Teacher deactivated")
