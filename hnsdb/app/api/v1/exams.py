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


@router.get("", response_model=SuccessResponse)
@router.get("/", response_model=SuccessResponse)
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
    if class_id: filter_query["class_id"] = ObjectId(class_id)
    if exam_type: filter_query["exam_type"] = exam_type
    if status: filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.exams.count_documents(filter_query)
    exams = await db.exams.find(filter_query).sort("exam_date", -1).skip(skip).limit(limit).to_list(length=limit)
    
    exams = [parse_mongo_document(e) for e in exams]
    
    return SuccessResponse(success=True, message="Exams retrieved", data={
        "exams": exams, "total": total, "page": page, "limit": limit
    })


@router.get("/subjects", response_model=SuccessResponse)
async def list_subjects(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List available subjects"""
    db = get_database()
    subjects = await db.subjects.find({}).to_list(length=None)
    subjects = [parse_mongo_document(s) for s in subjects]
    return SuccessResponse(success=True, message="Subjects retrieved", data={
        "subjects": subjects, "total": len(subjects)
    })


@router.get("/grading-systems", response_model=SuccessResponse)
async def get_grading_systems(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get grading systems"""
    db = get_database()
    systems = await db.grading_systems.find({}).to_list(length=None)
    systems = [parse_mongo_document(s) for s in systems]
    
    if not systems:
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
    
    return SuccessResponse(success=True, message="Grading systems retrieved", data={
        "systems": systems, "total": len(systems)
    })


@router.get("/{exam_id}", response_model=SuccessResponse)
async def get_exam(
    exam_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get exam details"""
    db = get_database()
    exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
    if not exam: raise HTTPException(status_code=404, detail="Exam not found")
    
    exam = parse_mongo_document(exam)
    
    return SuccessResponse(success=True, message="Exam retrieved", data=exam)


@router.post("", response_model=SuccessResponse, status_code=201)
@router.post("/", response_model=SuccessResponse, status_code=201)
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
    
    exam_name = body.get("exam_name", "").strip()
    exam_type = body.get("exam_type", "").strip()
    class_id = body.get("class_id", "")
    subject_id = body.get("subject_id", "")
    exam_date = body.get("exam_date", "")
    
    if not exam_name or not exam_type or not class_id or not subject_id or not exam_date:
        raise HTTPException(status_code=400, detail="Exam name, type, class, subject, and date are required")
    
    try:
        date_obj = datetime.strptime(exam_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    max_score = float(body.get("max_score", 100))
    
    doc = {
        "exam_name": exam_name,
        "exam_type": exam_type,
        "class_id": ObjectId(class_id),
        "subject_id": ObjectId(subject_id),
        "exam_date": date_obj,
        "max_score": max_score,
        "pass_mark": body.get("pass_mark", max_score * 0.5),
        "weight": body.get("weight", 1.0),
        "start_time": body.get("start_time"),
        "end_time": body.get("end_time"),
        "academic_year": body.get("academic_year"),
        "term": body.get("term"),
        "instructions": body.get("instructions"),
        "status": "scheduled",
        "results_entered": 0,
        "total_students": 0,
        "created_by": ObjectId(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    doc = {k: v for k, v in doc.items() if v is not None}
    
    result = await db.exams.insert_one(doc)
    doc = parse_mongo_document(doc)
    
    return SuccessResponse(success=True, message="Exam created", data=doc)


@router.put("/{exam_id}", response_model=SuccessResponse)
async def update_exam(
    exam_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))
):
    """Update exam"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    body["updated_at"] = datetime.utcnow()
    
    result = await db.exams.find_one_and_update(
        {"_id": ObjectId(exam_id)},
        {"$set": body},
        return_document=True
    )
    
    if not result: raise HTTPException(status_code=404, detail="Exam not found")
    result = parse_mongo_document(result)
    
    return SuccessResponse(success=True, message="Exam updated", data=result)


@router.delete("/{exam_id}", response_model=SuccessResponse)
async def cancel_exam(
    exam_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Cancel an exam (soft delete)"""
    db = get_database()
    result = await db.exams.update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
    )
    if result.modified_count == 0: raise HTTPException(status_code=404, detail="Exam not found")
    return SuccessResponse(success=True, message="Exam cancelled")


@router.delete("/{exam_id}/permanent", response_model=SuccessResponse)
async def permanently_delete_exam(
    exam_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Permanently delete an exam and all its results (admin only)"""
    db = get_database()
    
    # Check exam exists
    exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    exam_name = exam.get("exam_name", "Unknown")
    
    try:
        # Delete all exam results
        results_deleted = await db.exam_results.delete_many({"exam_id": ObjectId(exam_id)})
        
        # Delete the exam
        await db.exams.delete_one({"_id": ObjectId(exam_id)})
        
        # Log the deletion
        await db.audit_log.insert_one({
            "table_name": "exams",
            "record_id": exam_id,
            "operation": "DELETE_PERMANENT",
            "changed_by": ObjectId(current_user["_id"]) if current_user.get("_id") else None,
            "details": {
                "exam_name": exam_name,
                "exam_type": exam.get("exam_type"),
                "results_deleted": results_deleted.deleted_count
            },
            "changed_at": datetime.utcnow()
        })
        
        return SuccessResponse(
            success=True,
            message=f"Exam '{exam_name}' permanently deleted with {results_deleted.deleted_count} results"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete exam: {str(e)}")


@router.get("/results/{exam_id}", response_model=SuccessResponse)
async def get_results(
    exam_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get exam results"""
    db = get_database()
    exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
    if not exam: raise HTTPException(status_code=404, detail="Exam not found")
    
    results = await db.exam_results.find({"exam_id": ObjectId(exam_id)}).to_list(length=None)
    results = [parse_mongo_document(r) for r in results]
    
    scores = [r["score"] for r in results if r.get("score") is not None]
    stats = {
        "total_students": len(results),
        "highest_score": max(scores) if scores else 0,
        "lowest_score": min(scores) if scores else 0,
        "average_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "pass_rate": round(sum(1 for r in results if r.get("is_passed")) / len(results) * 100, 2) if results else 0
    }
    
    return SuccessResponse(success=True, message="Results retrieved", data={
        "exam": {
            "_id": str(exam["_id"]),
            "exam_name": exam.get("exam_name", ""),
            "max_score": exam.get("max_score", 100),
            "pass_mark": exam.get("pass_mark", 50)
        },
        "results": results,
        "statistics": stats
    })


@router.delete("/results/{exam_id}", response_model=SuccessResponse)
async def delete_exam_results(
    exam_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete all results for an exam (admin only)"""
    db = get_database()
    
    result = await db.exam_results.delete_many({"exam_id": ObjectId(exam_id)})
    
    # Update exam status back to scheduled
    await db.exams.update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {
            "results_entered": 0,
            "status": "scheduled",
            "updated_at": datetime.utcnow()
        }}
    )
    
    return SuccessResponse(success=True, message=f"Deleted {result.deleted_count} results, exam reset to scheduled")


@router.post("/results", response_model=SuccessResponse, status_code=201)
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
    
    exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
    if not exam: raise HTTPException(status_code=404, detail="Exam not found")
    
    successful = 0
    for r in results:
        score = float(r.get("score", 0))
        percentage = (score / exam["max_score"]) * 100 if exam.get("max_score", 0) > 0 else 0
        
        if percentage >= 80: grade = "A"
        elif percentage >= 70: grade = "B"
        elif percentage >= 60: grade = "C"
        elif percentage >= 50: grade = "D"
        else: grade = "F"
        
        try:
            await db.exam_results.update_one(
                {"exam_id": ObjectId(exam_id), "student_id": ObjectId(r["student_id"])},
                {"$set": {
                    "score": score,
                    "grade": grade,
                    "percentage": round(percentage, 2),
                    "is_passed": score >= exam.get("pass_mark", 50),
                    "remarks": r.get("remarks", ""),
                    "recorded_by": ObjectId(current_user["_id"]),
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
            successful += 1
        except Exception:
            pass
    
    total_results = await db.exam_results.count_documents({"exam_id": ObjectId(exam_id)})
    await db.exams.update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {
            "results_entered": total_results,
            "status": "completed",
            "updated_at": datetime.utcnow()
        }}
    )
    
    return SuccessResponse(success=True, message=f"Recorded {successful} results")


@router.get("/student/{student_id}", response_model=SuccessResponse)
async def get_student_results(
    student_id: str,
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get exam results for a student"""
    db = get_database()
    
    results = await db.exam_results.find({"student_id": ObjectId(student_id)}).to_list(length=None)
    results = [parse_mongo_document(r) for r in results]
    
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    
    return SuccessResponse(success=True, message="Student results retrieved", data={
        "student_id": student_id,
        "student_name": f"{student['first_name']} {student['last_name']}" if student else "Unknown",
        "results": results,
        "total": len(results)
    })
