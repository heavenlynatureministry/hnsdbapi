"""Teachers API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path, Request
from typing import Optional, Dict, Any
from datetime import date, datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.teacher import TeacherCreate
from app.schemas.common import SuccessResponse
from app.utils.helpers import parse_mongo_document

router = APIRouter()


def _safe_objectid(value) -> Optional[ObjectId]:
    """Safely convert a value to ObjectId, returning None if invalid/empty."""
    if not value:
        return None
    val = str(value).strip()
    if not val or val.lower() == "null" or val.lower() == "undefined":
        return None
    try:
        return ObjectId(val)
    except Exception:
        return None


@router.get("")
@router.get("/")
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
    teachers = [parse_mongo_document(t) for t in teachers]
    
    return {
        "success": True,
        "message": "Teachers retrieved",
        "data": {"teachers": teachers, "total": total, "page": page, "limit": limit}
    }


@router.get("/statistics/overview")
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
    
    return {
        "success": True,
        "message": "Statistics retrieved",
        "data": {
            "total_active_teachers": total,
            "by_status": {item["_id"]: item["count"] for item in by_status},
            "by_qualification": {item["_id"]: item["count"] for item in by_qualification}
        }
    }


@router.get("/search/available")
async def find_available_teachers(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Find teachers available for class assignment"""
    db = get_database()
    teachers = await db.teachers.find({"status": "active"}).sort("last_name", 1).to_list(length=None)
    teachers = [parse_mongo_document(t) for t in teachers]
    
    return {
        "success": True,
        "message": "Available teachers retrieved",
        "data": {"teachers": teachers, "total": len(teachers)}
    }


@router.get("/{teacher_id}")
async def get_teacher(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get teacher details"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    teacher = await db.teachers.find_one({"_id": obj_id})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    teacher = parse_mongo_document(teacher)
    
    return {
        "success": True,
        "message": "Teacher retrieved",
        "data": teacher
    }


# =========================================================================
# TEACHER WORKLOAD
# =========================================================================

@router.get("/{teacher_id}/workload")
async def get_teacher_workload(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get teacher workload summary"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    teacher = await db.teachers.find_one({"_id": obj_id})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    teacher_name = f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}".strip()
    
    # Get assigned classes
    assigned_classes = await db.classes.find({
        "class_teacher_id": obj_id,
        "status": "active"
    }).to_list(length=None)
    
    # Count students in assigned classes
    total_students = sum(c.get("current_enrollment", 0) for c in assigned_classes)
    
    # Get subjects
    subjects = teacher.get("subjects", [])
    
    # Get recent performance reviews
    reviews = await db.teacher_performance_reviews.find(
        {"teacher_id": obj_id}
    ).sort("review_date", -1).limit(3).to_list(length=None)
    
    # Get pending leave requests
    pending_leaves = await db.teacher_leaves.count_documents({
        "teacher_id": obj_id,
        "status": "pending"
    })
    
    # Calculate weekly hours (estimate: 3 hours per subject per week)
    weekly_hours = len(subjects) * 3 if subjects else len(assigned_classes) * 25
    
    return {
        "success": True,
        "message": "Workload retrieved",
        "data": {
            "teacher_name": teacher_name,
            "teacher_id": teacher_id,
            "qualification": teacher.get("qualification"),
            "specialization": teacher.get("specialization"),
            "total_classes": len(assigned_classes),
            "total_subjects": len(subjects),
            "subjects": subjects,
            "total_students": total_students,
            "weekly_hours": weekly_hours,
            "classes": [parse_mongo_document(c) for c in assigned_classes],
            "pending_leaves": pending_leaves,
            "recent_reviews": [parse_mongo_document(r) for r in reviews],
        }
    }


# =========================================================================
# TEACHER SUBJECTS
# =========================================================================

@router.get("/{teacher_id}/subjects")
async def get_teacher_subjects(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get teacher's assigned subjects"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    teacher = await db.teachers.find_one({"_id": obj_id})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    subjects = teacher.get("subjects", [])
    
    return {
        "success": True,
        "message": "Subjects retrieved",
        "data": {"subjects": subjects, "total": len(subjects)}
    }


@router.post("/{teacher_id}/subjects")
async def assign_subjects(
    teacher_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Assign subjects to teacher"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    subjects = body.get("subjects", [])
    
    await db.teachers.update_one(
        {"_id": obj_id},
        {"$set": {"subjects": subjects, "updated_at": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "message": f"Assigned {len(subjects)} subjects"
    }


# =========================================================================
# TEACHER CLASSES
# =========================================================================

@router.post("/{teacher_id}/classes")
async def assign_classes(
    teacher_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Assign teacher to classes"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    teacher = await db.teachers.find_one({"_id": obj_id})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    class_ids = body.get("class_ids", [])
    assigned = 0
    
    for cid in class_ids:
        class_obj_id = _safe_objectid(cid)
        if class_obj_id:
            await db.classes.update_one(
                {"_id": class_obj_id},
                {"$set": {"class_teacher_id": obj_id, "updated_at": datetime.utcnow()}}
            )
            assigned += 1
    
    return {
        "success": True,
        "message": f"Assigned to {assigned} classes"
    }


# =========================================================================
# PERFORMANCE REVIEWS
# =========================================================================

@router.get("/{teacher_id}/performance-reviews")
async def get_performance_reviews(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get teacher performance reviews"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    reviews = await db.teacher_performance_reviews.find(
        {"teacher_id": obj_id}
    ).sort("review_date", -1).to_list(length=None)
    
    reviews = [parse_mongo_document(r) for r in reviews]
    
    return {
        "success": True,
        "message": "Reviews retrieved",
        "data": {"reviews": reviews, "total": len(reviews)}
    }


@router.post("/{teacher_id}/performance-reviews")
async def add_performance_review(
    teacher_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Add performance review"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    review_doc = {
        "teacher_id": obj_id,
        "review_date": body.get("review_date", datetime.utcnow()),
        "reviewer": body.get("reviewer", ""),
        "rating": body.get("rating", 0),
        "comments": body.get("comments", ""),
        "strengths": body.get("strengths", ""),
        "areas_for_improvement": body.get("areas_for_improvement", ""),
        "goals": body.get("goals", ""),
        "created_by": current_user.get("_id"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.teacher_performance_reviews.insert_one(review_doc)
    review_doc["_id"] = str(result.inserted_id)
    review_doc = parse_mongo_document(review_doc)
    
    return {
        "success": True,
        "message": "Review added",
        "data": review_doc
    }


# =========================================================================
# TRAINING
# =========================================================================

@router.get("/{teacher_id}/training")
async def get_teacher_training(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get teacher training records"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    training = await db.teacher_training.find(
        {"teacher_id": obj_id}
    ).sort("completion_date", -1).to_list(length=None)
    
    training = [parse_mongo_document(t) for t in training]
    
    return {
        "success": True,
        "message": "Training retrieved",
        "data": {"training": training, "total": len(training)}
    }


@router.post("/{teacher_id}/training")
async def add_teacher_training(
    teacher_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Add training record"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    training_doc = {
        "teacher_id": obj_id,
        "training_name": body.get("training_name", ""),
        "provider": body.get("provider", ""),
        "completion_date": body.get("completion_date"),
        "duration_hours": body.get("duration_hours", 0),
        "certificate": body.get("certificate", ""),
        "notes": body.get("notes", ""),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.teacher_training.insert_one(training_doc)
    training_doc["_id"] = str(result.inserted_id)
    training_doc = parse_mongo_document(training_doc)
    
    return {
        "success": True,
        "message": "Training added",
        "data": training_doc
    }


# =========================================================================
# LEAVE MANAGEMENT
# =========================================================================

@router.get("/{teacher_id}/leave")
async def get_teacher_leave(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get teacher leave history"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    leaves = await db.teacher_leaves.find(
        {"teacher_id": obj_id}
    ).sort("start_date", -1).to_list(length=None)
    
    leaves = [parse_mongo_document(l) for l in leaves]
    
    return {
        "success": True,
        "message": "Leave history retrieved",
        "data": {"leaves": leaves, "total": len(leaves)}
    }


@router.post("/{teacher_id}/leave")
async def submit_leave(
    teacher_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Submit leave request"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    leave_doc = {
        "teacher_id": obj_id,
        "leave_type": body.get("leave_type", "annual"),
        "start_date": body.get("start_date"),
        "end_date": body.get("end_date"),
        "reason": body.get("reason", ""),
        "status": "pending",
        "submitted_by": current_user.get("_id"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.teacher_leaves.insert_one(leave_doc)
    leave_doc["_id"] = str(result.inserted_id)
    leave_doc = parse_mongo_document(leave_doc)
    
    return {
        "success": True,
        "message": "Leave request submitted",
        "data": leave_doc
    }


@router.patch("/leave/{leave_id}/approve")
async def approve_leave(
    leave_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Approve or reject leave"""
    db = get_database()
    
    obj_id = _safe_objectid(leave_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid leave ID")
    
    try:
        body = await request.json()
    except Exception:
        body = {}
    
    status = body.get("status", "approved")
    
    result = await db.teacher_leaves.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": status,
            "approved_by": current_user.get("_id"),
            "approval_date": datetime.utcnow(),
            "approval_notes": body.get("notes", ""),
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave not found")
    
    return {
        "success": True,
        "message": f"Leave {status}"
    }


# =========================================================================
# DOCUMENTS
# =========================================================================

@router.post("/{teacher_id}/documents")
async def upload_teacher_document(
    teacher_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Upload teacher document"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    doc = {
        "teacher_id": obj_id,
        "document_type": body.get("document_type", "other"),
        "document_name": body.get("document_name", ""),
        "document_url": body.get("document_url", ""),
        "uploaded_by": current_user.get("_id"),
        "created_at": datetime.utcnow()
    }
    
    result = await db.teacher_documents.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc = parse_mongo_document(doc)
    
    return {
        "success": True,
        "message": "Document uploaded",
        "data": doc
    }


# =========================================================================
# CREATE & UPDATE
# =========================================================================

@router.post("")
@router.post("/")
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
    if result: result = parse_mongo_document(result)
    
    return {"success": True, "message": message, "data": result}


@router.put("/{teacher_id}")
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
    if result: result = parse_mongo_document(result)
    
    return {"success": True, "message": message, "data": result}


@router.delete("/{teacher_id}")
async def deactivate_teacher(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Deactivate teacher (soft delete)"""
    db = get_database()
    from app.models.teacher import TeacherModel
    success, message, _ = await TeacherModel.update_teacher(
        db=db, teacher_id=teacher_id,
        update_data={"status": "inactive"},
        updated_by=current_user["_id"]
    )
    if not success: raise HTTPException(status_code=404, detail="Teacher not found")
    return {"success": True, "message": "Teacher deactivated"}


@router.delete("/{teacher_id}/permanent")
async def permanently_delete_teacher(
    teacher_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Permanently delete a teacher and all related records (admin only)"""
    db = get_database()
    
    obj_id = _safe_objectid(teacher_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid teacher ID")
    
    teacher = await db.teachers.find_one({"_id": obj_id})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    teacher_name = f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}"
    
    try:
        await db.classes.update_many(
            {"class_teacher_id": obj_id},
            {"$set": {"class_teacher_id": None, "updated_at": datetime.utcnow()}}
        )
        await db.teacher_performance_reviews.delete_many({"teacher_id": obj_id})
        await db.teacher_leaves.delete_many({"teacher_id": obj_id})
        await db.teacher_training.delete_many({"teacher_id": obj_id})
        await db.teacher_documents.delete_many({"teacher_id": obj_id})
        await db.teachers.delete_one({"_id": obj_id})
        
        await db.audit_log.insert_one({
            "table_name": "teachers",
            "record_id": teacher_id,
            "operation": "DELETE_PERMANENT",
            "changed_by": current_user.get("_id"),
            "details": {"teacher_name": teacher_name},
            "changed_at": datetime.utcnow()
        })
        
        return {"success": True, "message": f"Teacher '{teacher_name}' permanently deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete teacher: {str(e)}")
