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


def _calculate_age(dob) -> int:
    """Calculate age from date of birth"""
    if not dob:
        return None
    if isinstance(dob, str):
        try:
            dob = datetime.strptime(dob, "%Y-%m-%d").date()
        except ValueError:
            try:
                dob = datetime.strptime(dob, "%Y-%m-%dT%H:%M:%S").date()
            except ValueError:
                return None
    elif isinstance(dob, datetime):
        dob = dob.date()
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return age


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
    if class_id:
        cid = _safe_objectid(class_id)
        if cid: filter_query["current_class_id"] = cid
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
    
    for i, s in enumerate(students):
        students[i] = parse_mongo_document(s)
        # Calculate age
        students[i]["age"] = _calculate_age(s.get("date_of_birth"))
        # Add class name
        if students[i].get("current_class_id"):
            try:
                cid = _safe_objectid(students[i]["current_class_id"])
                if cid:
                    cls = await db.classes.find_one({"_id": cid})
                    if cls: students[i]["class_name"] = cls.get("class_name", "")
            except Exception:
                students[i]["class_name"] = "Unknown"
    
    return {
        "success": True, "message": "Students retrieved",
        "data": {"students": students, "total": total, "page": page, "limit": limit}
    }


@router.get("/statistics/overview")
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
    
    return {
        "success": True, "message": "Statistics retrieved",
        "data": {
            "total_active": total,
            "by_gender": {item["_id"]: item["count"] for item in by_gender},
            "by_type": {item["_id"]: item["count"] for item in by_type}
        }
    }


@router.get("/{student_id}")
async def get_student(
    student_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get student details"""
    db = get_database()
    
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    student = await db.students.find_one({"_id": sid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student = parse_mongo_document(student)
    
    # Calculate age
    student["age"] = _calculate_age(student.get("date_of_birth"))
    
    # Add class name
    if student.get("current_class_id"):
        try:
            cid = _safe_objectid(student["current_class_id"])
            if cid:
                cls = await db.classes.find_one({"_id": cid})
                if cls: student["class_name"] = cls.get("class_name", "")
        except Exception:
            student["class_name"] = "Unknown"
    
    # Get guardians
    guardians = await db.student_guardians.find({"student_id": sid}).to_list(length=None)
    student["guardians"] = [parse_mongo_document(g) for g in guardians]
    
    # Get attendance summary
    attendance_total = await db.attendance.count_documents({"student_id": sid})
    attendance_present = await db.attendance.count_documents({
        "student_id": sid, "status": {"$in": ["present", "late"]}
    })
    student["attendance_summary"] = {
        "total_days": attendance_total,
        "present_days": attendance_present,
        "attendance_rate": round((attendance_present / attendance_total * 100), 1) if attendance_total > 0 else 0
    }
    
    return {
        "success": True, "message": "Student retrieved",
        "data": student
    }


@router.post("")
@router.post("/")
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
    
    return {"success": True, "message": message, "data": result}


@router.put("/{student_id}")
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
    if result: result = parse_mongo_document(result)
    
    return {"success": True, "message": message, "data": result}


@router.delete("/{student_id}")
async def deactivate_student(
    student_id: str = Path(...),
    reason: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Deactivate student (soft delete)"""
    db = get_database()
    from app.models.student import StudentModel
    success, message, _ = await StudentModel.update_student(
        db=db, student_id=student_id,
        update_data={"status": "inactive", "status_reason": reason or "Deactivated by admin"},
        updated_by=current_user["_id"]
    )
    if not success: raise HTTPException(status_code=404, detail="Student not found")
    return {"success": True, "message": "Student deactivated"}


@router.delete("/{student_id}/permanent")
async def permanently_delete_student(
    student_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Permanently delete a student and all related records (admin only)"""
    db = get_database()
    
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    student = await db.students.find_one({"_id": sid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}"
    
    try:
        await db.attendance.delete_many({"student_id": sid})
        await db.exam_results.delete_many({"student_id": sid})
        await db.payments.delete_many({"student_id": sid})
        await db.student_guardians.delete_many({"student_id": sid})
        
        if student.get("current_class_id"):
            await db.classes.update_one(
                {"_id": student["current_class_id"]},
                {"$inc": {"current_enrollment": -1}}
            )
        
        await db.students.delete_one({"_id": sid})
        
        await db.audit_log.insert_one({
            "table_name": "students", "record_id": student_id,
            "operation": "DELETE_PERMANENT",
            "changed_by": current_user.get("_id"),
            "details": {"student_name": student_name, "student_id_number": student.get("student_id_number")},
            "changed_at": datetime.utcnow()
        })
        
        return {"success": True, "message": f"Student '{student_name}' permanently deleted with all related records"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")


# =========================================================================
# GUARDIANS
# =========================================================================

@router.get("/{student_id}/guardians")
async def get_student_guardians(
    student_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get student guardians"""
    db = get_database()
    
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    guardians = await db.student_guardians.find({"student_id": sid}).to_list(length=None)
    guardians = [parse_mongo_document(g) for g in guardians]
    
    return {"success": True, "message": "Guardians retrieved", "data": {"guardians": guardians, "total": len(guardians)}}


@router.post("/{student_id}/guardians")
async def add_guardian(
    student_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Add guardian to student"""
    db = get_database()
    from app.models.student import StudentModel
    
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    success, message, result = await StudentModel.add_guardian(
        db=db, student_id=student_id,
        first_name=body.get('first_name', ''),
        last_name=body.get('last_name', ''),
        relationship=body.get('relationship', ''),
        phone_number=body.get('phone_number', ''),
        email=body.get('email'),
        address=body.get('address'),
        occupation=body.get('occupation'),
        is_primary=body.get('is_primary_contact', False)
    )
    
    if not success: raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, "data": result}


@router.put("/{student_id}/guardians")
async def update_guardians(
    student_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update student guardians (replaces all)"""
    db = get_database()
    
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    guardians = body.get("guardians", [])
    
    # Remove existing guardians
    await db.student_guardians.delete_many({"student_id": sid})
    
    # Add new guardians
    for g in guardians:
        await db.student_guardians.insert_one({
            "student_id": sid,
            "first_name": g.get("first_name", ""),
            "last_name": g.get("last_name", ""),
            "relationship": g.get("relationship", ""),
            "phone_number": g.get("phone_number", ""),
            "email": g.get("email", ""),
            "address": g.get("address", ""),
            "occupation": g.get("occupation", ""),
            "is_primary_contact": g.get("is_primary_contact", False),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
    
    return {"success": True, "message": f"Updated {len(guardians)} guardians"}


@router.delete("/{student_id}/guardians/{guardian_id}")
async def remove_guardian(
    student_id: str = Path(...),
    guardian_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Remove a guardian"""
    db = get_database()
    
    gid = _safe_objectid(guardian_id)
    if not gid:
        raise HTTPException(status_code=400, detail="Invalid guardian ID")
    
    result = await db.student_guardians.delete_one({"_id": gid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Guardian not found")
    
    return {"success": True, "message": "Guardian removed"}


# =========================================================================
# ATTENDANCE SUMMARY
# =========================================================================

@router.get("/{student_id}/attendance-summary")
async def get_student_attendance_summary(
    student_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get attendance summary for a student"""
    db = get_database()
    
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    total = await db.attendance.count_documents({"student_id": sid})
    present = await db.attendance.count_documents({"student_id": sid, "status": {"$in": ["present", "late"]}})
    absent = await db.attendance.count_documents({"student_id": sid, "status": "absent"})
    excused = await db.attendance.count_documents({"student_id": sid, "status": "excused"})
    
    return {
        "success": True, "message": "Attendance summary retrieved",
        "data": {
            "total_days": total,
            "present_days": present,
            "absent_days": absent,
            "excused_days": excused,
            "attendance_rate": round((present / total * 100), 1) if total > 0 else 0
        }
    }
