"""Exams API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path, Request
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
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
async def list_exams(
    class_id: Optional[str] = Query(None),
    exam_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List exams with filters"""
    db = get_database()
    filter_query = {}
    if class_id:
        cid = _safe_objectid(class_id)
        if cid: filter_query["class_id"] = cid
    if exam_type: filter_query["exam_type"] = exam_type
    if status: filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.exams.count_documents(filter_query)
    exams = await db.exams.find(filter_query).sort("exam_date", -1).skip(skip).limit(limit).to_list(length=limit)
    exams = [parse_mongo_document(e) for e in exams]
    
    return {
        "success": True,
        "message": "Exams retrieved",
        "data": {"exams": exams, "total": total, "page": page, "limit": limit}
    }


@router.get("/subjects")
async def list_subjects(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List available subjects"""
    # Return default subjects since they may not be in a dedicated collection
    subjects = [
        "English Language", "Mathematics", "Science", "Social Studies",
        "Religious Education", "Creative Arts", "Physical Education",
        "Local Language", "Computer Studies", "Agriculture",
        "Business Studies", "History", "Geography", "Civics"
    ]
    return {
        "success": True,
        "message": "Subjects retrieved",
        "data": {"subjects": subjects, "total": len(subjects)}
    }


@router.get("/grading-systems")
async def get_grading_systems(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get grading systems"""
    systems = [{
        "_id": "default",
        "name": "Standard Grading System",
        "grade_boundaries": [
            {"grade": "A", "min_score": 80, "max_score": 100, "remarks": "Excellent", "gpa": 4.0},
            {"grade": "B", "min_score": 70, "max_score": 79, "remarks": "Very Good", "gpa": 3.0},
            {"grade": "C", "min_score": 60, "max_score": 69, "remarks": "Good", "gpa": 2.0},
            {"grade": "D", "min_score": 50, "max_score": 59, "remarks": "Satisfactory", "gpa": 1.0},
            {"grade": "F", "min_score": 0, "max_score": 49, "remarks": "Fail", "gpa": 0.0}
        ],
        "is_default": True
    }]
    
    return {
        "success": True,
        "message": "Grading systems retrieved",
        "data": {"systems": systems, "total": len(systems)}
    }


@router.get("/{exam_id}")
async def get_exam(
    exam_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get exam details"""
    db = get_database()
    
    obj_id = _safe_objectid(exam_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid exam ID")
    
    exam = await db.exams.find_one({"_id": obj_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    exam = parse_mongo_document(exam)
    return {
        "success": True,
        "message": "Exam retrieved",
        "data": exam
    }


@router.post("")
@router.post("/")
async def create_exam(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))
):
    """Create an exam"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    exam_name = (body.get("exam_name") or "").strip()
    exam_type = (body.get("exam_type") or "").strip()
    class_id = body.get("class_id", "")
    subject_id = body.get("subject_id", "")
    exam_date = body.get("exam_date", "")
    
    if not exam_name:
        raise HTTPException(status_code=400, detail="Exam name is required")
    if not exam_type:
        raise HTTPException(status_code=400, detail="Exam type is required")
    if not class_id:
        raise HTTPException(status_code=400, detail="Class is required")
    if not subject_id:
        raise HTTPException(status_code=400, detail="Subject is required")
    if not exam_date:
        raise HTTPException(status_code=400, detail="Exam date is required")
    
    # Validate ObjectIds
    cid = _safe_objectid(class_id)
    if not cid:
        raise HTTPException(status_code=400, detail="Invalid class ID format")
    
    sid = _safe_objectid(subject_id)
    # Subject might not be an ObjectId - could be a string subject name
    if sid:
        subject_id_value = sid
    else:
        subject_id_value = subject_id  # Keep as string if not a valid ObjectId
    
    try:
        date_obj = datetime.strptime(exam_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    max_score = float(body.get("max_score", 100))
    pass_mark = body.get("pass_mark", max_score * 0.5)
    
    user_id = current_user.get("_id")
    uid = _safe_objectid(user_id) if user_id else None
    
    doc = {
        "exam_name": exam_name,
        "exam_type": exam_type,
        "class_id": cid,
        "subject_id": subject_id_value,
        "exam_date": date_obj,
        "max_score": max_score,
        "pass_mark": float(pass_mark),
        "weight": float(body.get("weight", 1.0)),
        "start_time": body.get("start_time"),
        "end_time": body.get("end_time"),
        "academic_year": body.get("academic_year"),
        "term": body.get("term"),
        "instructions": body.get("instructions"),
        "status": "scheduled",
        "results_entered": 0,
        "total_students": 0,
        "created_by": uid,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Remove None values
    doc = {k: v for k, v in doc.items() if v is not None}
    
    try:
        result = await db.exams.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        doc = parse_mongo_document(doc)
        
        return {
            "success": True,
            "message": "Exam created",
            "data": doc
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create exam: {str(e)}")


@router.put("/{exam_id}")
async def update_exam(
    exam_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))
):
    """Update exam"""
    db = get_database()
    
    obj_id = _safe_objectid(exam_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid exam ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Remove protected fields
    for key in ["_id", "id", "created_at", "created_by"]:
        body.pop(key, None)
    
    # Safely convert ObjectId fields
    if body.get("class_id"):
        cid = _safe_objectid(body["class_id"])
        if cid: body["class_id"] = cid
        else: body.pop("class_id")
    
    if body.get("subject_id"):
        sid = _safe_objectid(body["subject_id"])
        if sid: body["subject_id"] = sid
    
    body["updated_at"] = datetime.utcnow()
    
    try:
        result = await db.exams.find_one_and_update(
            {"_id": obj_id},
            {"$set": body},
            return_document=True
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        result = parse_mongo_document(result)
        return {
            "success": True,
            "message": "Exam updated",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update exam: {str(e)}")


@router.delete("/{exam_id}")
async def cancel_exam(
    exam_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Cancel an exam (soft delete)"""
    db = get_database()
    
    obj_id = _safe_objectid(exam_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid exam ID")
    
    result = await db.exams.update_one(
        {"_id": obj_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    return {"success": True, "message": "Exam cancelled"}


@router.delete("/{exam_id}/permanent")
async def permanently_delete_exam(
    exam_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Permanently delete an exam and all its results"""
    db = get_database()
    
    obj_id = _safe_objectid(exam_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid exam ID")
    
    exam = await db.exams.find_one({"_id": obj_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    exam_name = exam.get("exam_name", "Unknown")
    
    try:
        results_deleted = await db.exam_results.delete_many({"exam_id": obj_id})
        await db.exams.delete_one({"_id": obj_id})
        
        await db.audit_log.insert_one({
            "table_name": "exams",
            "record_id": exam_id,
            "operation": "DELETE_PERMANENT",
            "changed_by": _safe_objectid(current_user.get("_id")) if current_user.get("_id") else None,
            "details": {
                "exam_name": exam_name,
                "exam_type": exam.get("exam_type"),
                "results_deleted": results_deleted.deleted_count
            },
            "changed_at": datetime.utcnow()
        })
        
        return {
            "success": True,
            "message": f"Exam '{exam_name}' permanently deleted with {results_deleted.deleted_count} results"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete exam: {str(e)}")


@router.get("/results/{exam_id}")
async def get_results(
    exam_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get exam results"""
    db = get_database()
    
    obj_id = _safe_objectid(exam_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid exam ID")
    
    exam = await db.exams.find_one({"_id": obj_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    results = await db.exam_results.find({"exam_id": obj_id}).to_list(length=None)
    results = [parse_mongo_document(r) for r in results]
    
    scores = [r["score"] for r in results if r.get("score") is not None]
    stats = {
        "total_students": len(results),
        "highest_score": max(scores) if scores else 0,
        "lowest_score": min(scores) if scores else 0,
        "average_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "pass_rate": round(sum(1 for r in results if r.get("is_passed")) / len(results) * 100, 2) if results else 0
    }
    
    return {
        "success": True,
        "message": "Results retrieved",
        "data": {
            "exam": {
                "_id": str(exam["_id"]),
                "exam_name": exam.get("exam_name", ""),
                "max_score": exam.get("max_score", 100),
                "pass_mark": exam.get("pass_mark", 50)
            },
            "results": results,
            "statistics": stats
        }
    }


@router.delete("/results/{exam_id}")
async def delete_exam_results(
    exam_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete all results for an exam"""
    db = get_database()
    
    obj_id = _safe_objectid(exam_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid exam ID")
    
    result = await db.exam_results.delete_many({"exam_id": obj_id})
    
    await db.exams.update_one(
        {"_id": obj_id},
        {"$set": {"results_entered": 0, "status": "scheduled", "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "message": f"Deleted {result.deleted_count} results, exam reset to scheduled"}


@router.post("/results")
async def record_results(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))
):
    """Record exam results"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    exam_id = body.get("exam_id", "")
    results = body.get("results", [])
    
    if not exam_id or not results:
        raise HTTPException(status_code=400, detail="exam_id and results are required")
    
    eid = _safe_objectid(exam_id)
    if not eid:
        raise HTTPException(status_code=400, detail="Invalid exam ID")
    
    exam = await db.exams.find_one({"_id": eid})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    max_score = exam.get("max_score", 100)
    pass_mark = exam.get("pass_mark", 50)
    
    successful = 0
    for r in results:
        try:
            score = float(r.get("score", 0))
            percentage = (score / max_score) * 100 if max_score > 0 else 0
            
            if percentage >= 80: grade = "A"
            elif percentage >= 70: grade = "B"
            elif percentage >= 60: grade = "C"
            elif percentage >= 50: grade = "D"
            else: grade = "F"
            
            student_id = _safe_objectid(r.get("student_id"))
            if not student_id:
                continue
            
            await db.exam_results.update_one(
                {"exam_id": eid, "student_id": student_id},
                {"$set": {
                    "score": score,
                    "grade": grade,
                    "percentage": round(percentage, 2),
                    "is_passed": score >= pass_mark,
                    "remarks": r.get("remarks", ""),
                    "recorded_by": _safe_objectid(current_user.get("_id")),
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
            successful += 1
        except Exception:
            pass
    
    total_results = await db.exam_results.count_documents({"exam_id": eid})
    await db.exams.update_one(
        {"_id": eid},
        {"$set": {"results_entered": total_results, "status": "completed", "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "message": f"Recorded {successful} results"}


@router.get("/student/{student_id}")
async def get_student_results(
    student_id: str,
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get exam results for a student"""
    db = get_database()
    
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    results = await db.exam_results.find({"student_id": sid}).to_list(length=None)
    results = [parse_mongo_document(r) for r in results]
    
    student = await db.students.find_one({"_id": sid})
    
    return {
        "success": True,
        "message": "Student results retrieved",
        "data": {
            "student_id": student_id,
            "student_name": f"{student['first_name']} {student['last_name']}" if student else "Unknown",
            "results": results,
            "total": len(results)
        }
    }






update with this
@router.post("/report-cards/generate")
async def generate_report_card(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate student report card"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    student_id = body.get("student_id")
    term = body.get("term", "Term 1")
    academic_year = body.get("academic_year")
    
    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID is required")
    
    try:
        sid = ObjectId(student_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    student = await db.students.find_one({"_id": sid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get exam results
    results = await db.exam_results.find({"student_id": sid}).to_list(length=None)
    
    # Get exams for context
    exam_ids = [r["exam_id"] for r in results if r.get("exam_id")]
    exams = await db.exams.find({"_id": {"$in": exam_ids}}).to_list(length=None) if exam_ids else []
    exam_map = {str(e["_id"]): e for e in exams}
    
    report_results = []
    total_score = 0
    total_max = 0
    
    for r in results:
        exam = exam_map.get(str(r.get("exam_id", "")), {})
        total_score += r.get("score", 0)
        total_max += exam.get("max_score", 0)
        report_results.append({
            "subject": exam.get("subject_name", exam.get("exam_name", "Unknown")),
            "score": r.get("score", 0),
            "max_score": exam.get("max_score", 100),
            "grade": r.get("grade", "N/A"),
            "remarks": r.get("remarks", ""),
            "is_passed": r.get("is_passed", False),
        })
    
    average = round((total_score / total_max * 100), 1) if total_max > 0 else 0
    
    return {
        "success": True,
        "message": "Report card generated",
        "data": {
            "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
            "student_id": student_id,
            "academic_year": academic_year,
            "term": term,
            "results": report_results,
            "total_score": total_score,
            "total_max": total_max,
            "average_percentage": average,
            "grade": "A" if average >= 80 else "B" if average >= 70 else "C" if average >= 60 else "D" if average >= 50 else "F"
        }
    }
