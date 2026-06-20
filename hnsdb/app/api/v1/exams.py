"""Exams API"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse

router = APIRouter()

@router.get("/", response_model=SuccessResponse)
async def list_exams(
    class_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List exams"""
    db = get_database()
    filter_query = {}
    if class_id: filter_query["class_id"] = ObjectId(class_id)
    
    skip = (page - 1) * limit
    total = await db.exams.count_documents(filter_query)
    exams = await db.exams.find(filter_query).sort("exam_date", -1).skip(skip).limit(limit).to_list(length=limit)
    
    for e in exams:
        e["_id"] = str(e["_id"])
        e["class_id"] = str(e["class_id"])
        e["subject_id"] = str(e["subject_id"])
    
    return SuccessResponse(success=True, message="Exams retrieved", data={"exams": exams, "total": total})

@router.post("/", response_model=SuccessResponse, status_code=201)
async def create_exam(
    exam_name: str = Body(...),
    exam_type: str = Body(...),
    class_id: str = Body(...),
    subject_id: str = Body(...),
    exam_date: str = Body(...),
    max_score: float = Body(100),
    current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))
):
    """Create an exam"""
    db = get_database()
    doc = {
        "exam_name": exam_name, "exam_type": exam_type,
        "class_id": ObjectId(class_id), "subject_id": ObjectId(subject_id),
        "exam_date": datetime.strptime(exam_date, "%Y-%m-%d"),
        "max_score": max_score, "pass_mark": max_score * 0.5,
        "status": "scheduled", "results_entered": 0, "total_students": 0,
        "created_by": ObjectId(current_user["_id"]),
        "created_at": datetime.utcnow()
    }
    result = await db.exams.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["class_id"] = str(doc["class_id"])
    doc["subject_id"] = str(doc["subject_id"])
    return SuccessResponse(success=True, message="Exam created", data=doc)

@router.get("/results/{exam_id}", response_model=SuccessResponse)
async def get_results(exam_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get exam results"""
    db = get_database()
    results = await db.exam_results.find({"exam_id": ObjectId(exam_id)}).to_list(length=None)
    for r in results:
        r["_id"] = str(r["_id"])
        r["exam_id"] = str(r["exam_id"])
        r["student_id"] = str(r["student_id"])
    return SuccessResponse(success=True, message="Results retrieved", data={"results": results, "total": len(results)})

@router.post("/results", response_model=SuccessResponse, status_code=201)
async def record_results(
    exam_id: str = Body(...),
    results: List[Dict[str, Any]] = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))
):
    """Record exam results"""
    db = get_database()
    exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
    if not exam: raise HTTPException(status_code=404, detail="Exam not found")
    
    successful = 0
    for r in results:
        score = r.get("score", 0)
        percentage = (score / exam["max_score"]) * 100
        grade = "A" if percentage >= 80 else "B" if percentage >= 70 else "C" if percentage >= 60 else "D" if percentage >= 50 else "F"
        
        await db.exam_results.update_one(
            {"exam_id": ObjectId(exam_id), "student_id": ObjectId(r["student_id"])},
            {"$set": {
                "score": score, "grade": grade, "percentage": round(percentage, 2),
                "is_passed": score >= exam["pass_mark"],
                "recorded_by": ObjectId(current_user["_id"]),
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
        successful += 1
    
    await db.exams.update_one({"_id": ObjectId(exam_id)}, {"$set": {"results_entered": successful, "status": "completed"}})
    return SuccessResponse(success=True, message=f"Recorded {successful} results")

@router.get("/subjects", response_model=SuccessResponse)
async def list_subjects(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List subjects"""
    db = get_database()
    subjects = await db.subjects.find({}).to_list(length=None)
    for s in subjects: s["_id"] = str(s["_id"])
    return SuccessResponse(success=True, message="Subjects retrieved", data={"subjects": subjects, "total": len(subjects)})
