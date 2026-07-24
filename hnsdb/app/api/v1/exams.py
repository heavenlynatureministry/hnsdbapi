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


def _get_current_academic_year() -> str:
    """Calculate current academic year dynamically."""
    now = datetime.utcnow()
    year = now.year
    month = now.month
    start_year = year - 1 if month == 1 else year
    return f"{start_year}/{start_year + 1}"


def _calculate_grade(percentage: float) -> str:
    """Calculate grade based on percentage."""
    if percentage >= 80: return "A"
    elif percentage >= 70: return "B"
    elif percentage >= 60: return "C"
    elif percentage >= 50: return "D"
    else: return "F"


def _get_student_id_number(student: dict) -> str:
    """Get the proper student ID number (HNS format) from student document."""
    student_id = (
        student.get("student_id") or 
        student.get("student_id_number") or 
        student.get("id_number") or
        student.get("admission_number") or
        str(student.get("_id", ""))
    )
    return str(student_id)


def _generate_remarks(percentage: float, is_annual: bool = False) -> str:
    """Generate remarks based on performance percentage."""
    if percentage >= 80:
        base = "Excellent performance! Keep up the great work."
        if is_annual: base += " Promoted to the next class."
        return base
    elif percentage >= 70:
        base = "Very good performance. Continue working hard."
        if is_annual: base += " Promoted to the next class."
        return base
    elif percentage >= 60:
        base = "Good performance. There is room for improvement."
        if is_annual: base += " Promoted to the next class."
        return base
    elif percentage >= 50:
        base = "Satisfactory performance. More effort is needed."
        if is_annual: base += " Promoted to the next class with recommendation for extra support."
        return base
    else:
        base = "Needs significant improvement. Extra support recommended."
        if is_annual: base += " Advised to repeat the class for better foundation."
        return base


def _get_next_class_name(class_name: str) -> str:
    """Get the next class name based on current class."""
    if not class_name: return "Next Class"
    progression = {
        "N1": "N2", "N2": "N3", "N3": "P1",
        "P1": "P2", "P2": "P3", "P3": "P4",
        "P4": "P5", "P5": "P6", "P6": "P7",
        "P7": "P8", "P8": "S1",
        "S1": "S2", "S2": "S3", "S3": "S4",
    }
    if class_name.upper() in progression:
        return progression[class_name.upper()]
    for key, value in progression.items():
        if key in class_name.upper():
            return class_name.upper().replace(key, value)
    return f"Next Level after {class_name}"


def _is_nursery_class(class_name: str) -> bool:
    """Check if class is a nursery/graduating class (N3, P7, S4)."""
    if not class_name:
        return False
    graduating = ["N3", "P7", "P8", "S4"]
    return class_name.upper() in graduating


async def _calculate_position(db, student_oid, class_id, overall_percentage, term, academic_year) -> tuple:
    """Calculate student's position in class. Returns (position, out_of)."""
    try:
        classmates = await db.students.find({
            "current_class_id": class_id, "status": "active"
        }).to_list(length=None)
        
        total_students = len(classmates)
        if total_students <= 1: return "1", str(total_students)
        
        class_percentages = []
        for classmate in classmates:
            c_oid = classmate["_id"]
            c_results = await db.exam_results.find({
                "student_id": c_oid, "term": term, "academic_year": academic_year
            }).to_list(length=None)
            if not c_results:
                c_results = await db.exam_results.find({"student_id": c_oid}).to_list(length=None)
            
            c_exam_ids = [r["exam_id"] for r in c_results if r.get("exam_id")]
            c_exams = await db.exams.find({"_id": {"$in": c_exam_ids}}).to_list(length=None) if c_exam_ids else []
            c_exam_map = {str(e["_id"]): e for e in c_exams}
            
            c_total_score = 0; c_total_max = 0
            for cr in c_results:
                c_exam = c_exam_map.get(str(cr.get("exam_id", "")), {})
                c_total_score += float(cr.get("score", 0))
                c_total_max += float(c_exam.get("max_score", 100))
            
            if c_total_max > 0:
                class_percentages.append(round((c_total_score / c_total_max * 100), 1))
            else:
                class_percentages.append(0)
        
        class_percentages.sort(reverse=True)
        position = class_percentages.index(overall_percentage) + 1 if overall_percentage in class_percentages else total_students
        return str(position), str(total_students)
    except Exception as e:
        print(f"Error calculating position: {e}")
        return "N/A", "N/A"


async def _get_student_attendance(db, student_oid, term, academic_year) -> dict:
    """Get attendance summary for a student with flexible matching."""
    attendance_total = 0
    attendance_present = 0
    
    records = await db.attendance.find({
        "student_id": student_oid, "term": term, "academic_year": academic_year
    }).to_list(length=None)
    
    if not records:
        records = await db.attendance.find({
            "student_id": student_oid, "academic_year": academic_year
        }).to_list(length=None)
    
    if not records:
        year_start = academic_year.split('/')[0] if '/' in academic_year else academic_year
        records = await db.attendance.find({
            "student_id": student_oid, "date": {"$regex": f"^{year_start}"}
        }).to_list(length=None)
    
    if not records:
        records = await db.attendance.find({
            "student_id": student_oid
        }).sort("date", -1).limit(200).to_list(length=200)
    
    attendance_total = len(records)
    attendance_present = sum(1 for r in records if r.get("status") in ["present", "late"])
    attendance_rate = round((attendance_present / attendance_total * 100), 1) if attendance_total > 0 else 0
    
    return {
        "total_days": attendance_total,
        "present_days": attendance_present,
        "attendance_rate": attendance_rate
    }


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
        "success": True, "message": "Exams retrieved",
        "data": {"exams": exams, "total": total, "page": page, "limit": limit}
    }


@router.get("/subjects")
async def list_subjects(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List available subjects"""
    subjects = [
        "English Language", "Mathematics", "Science", "Social Studies",
        "Religious Education", "Creative Arts", "Physical Education",
        "Local Language", "Computer Studies", "Agriculture",
        "Business Studies", "History", "Geography", "Civics"
    ]
    return {"success": True, "message": "Subjects retrieved", "data": {"subjects": subjects, "total": len(subjects)}}


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
    return {"success": True, "message": "Grading systems retrieved", "data": {"systems": systems, "total": len(systems)}}


@router.get("/{exam_id}")
async def get_exam(exam_id: str = Path(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get exam details"""
    db = get_database()
    obj_id = _safe_objectid(exam_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid exam ID")
    exam = await db.exams.find_one({"_id": obj_id})
    if not exam: raise HTTPException(status_code=404, detail="Exam not found")
    return {"success": True, "message": "Exam retrieved", "data": parse_mongo_document(exam)}


@router.post("")
@router.post("/")
async def create_exam(request: Request, current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))):
    """Create an exam"""
    db = get_database()
    try: body = await request.json()
    except Exception: raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    exam_name = (body.get("exam_name") or "").strip()
    exam_type = (body.get("exam_type") or "").strip()
    class_id = body.get("class_id", "")
    subject_id = body.get("subject_id", "")
    exam_date = body.get("exam_date", "")
    
    if not exam_name: raise HTTPException(status_code=400, detail="Exam name is required")
    if not exam_type: raise HTTPException(status_code=400, detail="Exam type is required")
    if not class_id: raise HTTPException(status_code=400, detail="Class is required")
    if not subject_id: raise HTTPException(status_code=400, detail="Subject is required")
    if not exam_date: raise HTTPException(status_code=400, detail="Exam date is required")
    
    cid = _safe_objectid(class_id)
    if not cid: raise HTTPException(status_code=400, detail="Invalid class ID format")
    sid = _safe_objectid(subject_id)
    subject_id_value = sid if sid else subject_id
    
    try: date_obj = datetime.strptime(exam_date, "%Y-%m-%d")
    except ValueError: raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    max_score = float(body.get("max_score", 100))
    pass_mark = body.get("pass_mark", max_score * 0.5)
    uid = _safe_objectid(current_user.get("_id")) if current_user.get("_id") else None
    
    doc = {
        "exam_name": exam_name, "exam_type": exam_type,
        "class_id": cid, "subject_id": subject_id_value,
        "exam_date": date_obj, "max_score": max_score,
        "pass_mark": float(pass_mark), "weight": float(body.get("weight", 1.0)),
        "start_time": body.get("start_time"), "end_time": body.get("end_time"),
        "academic_year": body.get("academic_year"), "term": body.get("term"),
        "instructions": body.get("instructions"),
        "status": "scheduled", "results_entered": 0, "total_students": 0,
        "created_by": uid, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
    }
    doc = {k: v for k, v in doc.items() if v is not None}
    
    try:
        result = await db.exams.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return {"success": True, "message": "Exam created", "data": parse_mongo_document(doc)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create exam: {str(e)}")


@router.put("/{exam_id}")
async def update_exam(exam_id: str = Path(...), request: Request = None, current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))):
    """Update exam"""
    db = get_database()
    obj_id = _safe_objectid(exam_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid exam ID")
    try: body = await request.json()
    except Exception: raise HTTPException(status_code=400, detail="Invalid JSON body")
    if not body: raise HTTPException(status_code=400, detail="No fields to update")
    for key in ["_id", "id", "created_at", "created_by"]: body.pop(key, None)
    if body.get("class_id"):
        cid = _safe_objectid(body["class_id"]); body["class_id"] = cid if cid else body.pop("class_id")
    if body.get("subject_id"):
        sid = _safe_objectid(body["subject_id"]); body["subject_id"] = sid if sid else None
    body["updated_at"] = datetime.utcnow()
    try:
        result = await db.exams.find_one_and_update({"_id": obj_id}, {"$set": body}, return_document=True)
        if not result: raise HTTPException(status_code=404, detail="Exam not found")
        return {"success": True, "message": "Exam updated", "data": parse_mongo_document(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update exam: {str(e)}")


@router.delete("/{exam_id}")
async def cancel_exam(exam_id: str = Path(...), current_user: Dict[str, Any] = Depends(require_role("admin"))):
    """Cancel an exam (soft delete)"""
    db = get_database()
    obj_id = _safe_objectid(exam_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid exam ID")
    result = await db.exams.update_one({"_id": obj_id}, {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}})
    if result.modified_count == 0: raise HTTPException(status_code=404, detail="Exam not found")
    return {"success": True, "message": "Exam cancelled"}


@router.delete("/{exam_id}/permanent")
async def permanently_delete_exam(exam_id: str = Path(...), current_user: Dict[str, Any] = Depends(require_role("admin"))):
    """Permanently delete an exam and all its results"""
    db = get_database()
    obj_id = _safe_objectid(exam_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid exam ID")
    exam = await db.exams.find_one({"_id": obj_id})
    if not exam: raise HTTPException(status_code=404, detail="Exam not found")
    exam_name = exam.get("exam_name", "Unknown")
    try:
        results_deleted = await db.exam_results.delete_many({"exam_id": obj_id})
        await db.exams.delete_one({"_id": obj_id})
        await db.audit_log.insert_one({
            "table_name": "exams", "record_id": exam_id, "operation": "DELETE_PERMANENT",
            "changed_by": _safe_objectid(current_user.get("_id")) if current_user.get("_id") else None,
            "details": {"exam_name": exam_name, "exam_type": exam.get("exam_type"), "results_deleted": results_deleted.deleted_count},
            "changed_at": datetime.utcnow()
        })
        return {"success": True, "message": f"Exam '{exam_name}' permanently deleted with {results_deleted.deleted_count} results"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete exam: {str(e)}")


# =========================================================================
# REPORT CARDS
# =========================================================================

@router.post("/report-cards/generate")
async def generate_report_card(request: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Generate student report card for a single term"""
    db = get_database()
    try: body = await request.json()
    except Exception: raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    student_id = body.get("student_id")
    term = body.get("term", "Term 1")
    academic_year = body.get("academic_year") or _get_current_academic_year()
    if not student_id: raise HTTPException(status_code=400, detail="Student ID is required")
    
    sid = _safe_objectid(student_id); student = None
    if sid: student = await db.students.find_one({"_id": sid})
    if not student:
        student = await db.students.find_one({
            "$or": [{"student_id": student_id}, {"student_id_number": student_id},
                    {"id_number": student_id}, {"admission_number": student_id}]
        })
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    
    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
    student_id_number = _get_student_id_number(student)
    student_oid = student.get("_id")
    
    class_name = ""; class_id = student.get("current_class_id")
    if class_id:
        try:
            cls = await db.classes.find_one({"_id": class_id})
            if cls: class_name = cls.get("class_name", "")
        except Exception: pass
    
    results = await db.exam_results.find({
        "student_id": student_oid, "term": term, "academic_year": academic_year
    }).to_list(length=None)
    if not results:
        results = await db.exam_results.find({"student_id": student_oid}).to_list(length=None)
    
    exam_ids = [r["exam_id"] for r in results if r.get("exam_id")]
    exams = await db.exams.find({"_id": {"$in": exam_ids}}).to_list(length=None) if exam_ids else []
    exam_map = {str(e["_id"]): e for e in exams}
    
    subject_results = {}
    for r in results:
        exam = exam_map.get(str(r.get("exam_id", "")), {})
        subject_name = exam.get("subject_name") or exam.get("exam_name", "Unknown")
        if subject_name not in subject_results:
            subject_results[subject_name] = {"name": subject_name, "score": 0, "max_score": 0, "grade": "N/A", "remarks": ""}
        subject_results[subject_name]["score"] += float(r.get("score", 0))
        subject_results[subject_name]["max_score"] += float(exam.get("max_score", 100))
    
    subjects_list = []; total_score = 0; total_max = 0
    for name, data in subject_results.items():
        percentage = (data["score"] / data["max_score"] * 100) if data["max_score"] > 0 else 0
        data["percentage"] = round(percentage, 1); data["grade"] = _calculate_grade(percentage)
        data["score"] = round(data["score"], 1)
        subjects_list.append(data); total_score += data["score"]; total_max += data["max_score"]
    
    overall_percentage = round((total_score / total_max * 100), 1) if total_max > 0 else 0
    overall_grade = _calculate_grade(overall_percentage)
    
    school = await db.school_info.find_one({}) or {}
    attendance_data = await _get_student_attendance(db, student_oid, term, academic_year)
    
    position = body.get("position"); out_of = body.get("out_of")
    if not position and class_id:
        position, out_of = await _calculate_position(db, student_oid, class_id, overall_percentage, term, academic_year)
    if not position: position = "N/A"
    if not out_of: out_of = "N/A"
    
    remarks = body.get("remarks", "")
    if not remarks: remarks = _generate_remarks(overall_percentage, is_annual=False)
    
    verify_url = f"https://hnsdbapi.vercel.app/verify-report/{student_id_number}"
    is_nursery = _is_nursery_class(class_name)
    
    return {
        "success": True, "message": "Report card generated",
        "data": {
            "student": {"name": student_name, "student_id": student_id_number, "class_name": class_name, "conduct": body.get("conduct", "Good")},
            "results": {
                "subjects": subjects_list, "total_score": total_score, "total_max": total_max,
                "percentage": overall_percentage, "grade": overall_grade,
                "position": position, "out_of": out_of,
                "result": "Pass" if overall_percentage >= 50 else "Fail",
                "remarks": remarks, "conduct": body.get("conduct", "Good")
            },
            "term": term, "academic_year": academic_year, "verify_url": verify_url,
            "attendance": attendance_data, "is_nursery": is_nursery,
            "school": {
                "name": school.get("school_name", "Heavenly Nature Nursery & Primary School"),
                "address": school.get("address", ""), "phone": school.get("phone", ""),
                "email": school.get("email", ""), "motto": school.get("motto", "Nurturing Right Leaders"),
                "logo_url": school.get("logo_url", "/logo.png")
            }
        }
    }


@router.post("/report-cards/annual")
async def generate_annual_report_card(request: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Generate annual report card with all 3 terms"""
    db = get_database()
    try: body = await request.json()
    except Exception: raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    student_id = body.get("student_id")
    academic_year = body.get("academic_year") or _get_current_academic_year()
    if not student_id: raise HTTPException(status_code=400, detail="Student ID is required")
    
    sid = _safe_objectid(student_id); student = None
    if sid: student = await db.students.find_one({"_id": sid})
    if not student:
        student = await db.students.find_one({
            "$or": [{"student_id": student_id}, {"student_id_number": student_id},
                    {"id_number": student_id}, {"admission_number": student_id}]
        })
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    
    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
    student_id_number = _get_student_id_number(student)
    student_oid = student.get("_id")
    
    class_name = ""; class_id = student.get("current_class_id")
    if class_id:
        try:
            cls = await db.classes.find_one({"_id": class_id})
            if cls: class_name = cls.get("class_name", "")
        except Exception: pass
    
    is_nursery = _is_nursery_class(class_name)
    
    all_results = await db.exam_results.find({"student_id": student_oid}).to_list(length=None)
    exam_ids = list(set([r["exam_id"] for r in all_results if r.get("exam_id")]))
    exams = await db.exams.find({"_id": {"$in": exam_ids}}).to_list(length=None) if exam_ids else []
    exam_map = {str(e["_id"]): e for e in exams}
    
    def get_body_value(key, default=None): return body.get(key, default)
    
    async def build_term_results(term_name):
        term_results = [r for r in all_results if r.get("term") == term_name or exam_map.get(str(r.get("exam_id", "")), {}).get("term") == term_name]
        if not term_results: return None
        subject_results = {}
        for r in term_results:
            exam = exam_map.get(str(r.get("exam_id", "")), {})
            subject_name = exam.get("subject_name") or exam.get("exam_name", "Unknown")
            if subject_name not in subject_results:
                subject_results[subject_name] = {"name": subject_name, "score": 0, "max_score": 0}
            subject_results[subject_name]["score"] += float(r.get("score", 0))
            subject_results[subject_name]["max_score"] += float(exam.get("max_score", 100))
        subjects_list = []; total_score = 0; total_max = 0
        for name, data in subject_results.items():
            percentage = (data["score"] / data["max_score"] * 100) if data["max_score"] > 0 else 0
            data["percentage"] = round(percentage, 1); data["grade"] = _calculate_grade(percentage)
            data["score"] = round(data["score"], 1)
            subjects_list.append(data); total_score += data["score"]; total_max += data["max_score"]
        overall_percentage = round((total_score / total_max * 100), 1) if total_max > 0 else 0
        term_position = get_body_value(f"position_{term_name.lower().replace(' ', '_')}")
        term_out_of = get_body_value(f"out_of_{term_name.lower().replace(' ', '_')}")
        if not term_position and class_id:
            term_position, term_out_of = await _calculate_position(db, student_oid, class_id, overall_percentage, term_name, academic_year)
        term_remarks = get_body_value(f"remarks_{term_name.lower().replace(' ', '_')}", "")
        if not term_remarks: term_remarks = _generate_remarks(overall_percentage, is_annual=False)
        return {
            "subjects": subjects_list, "total_score": total_score, "total_max": total_max,
            "percentage": overall_percentage, "grade": _calculate_grade(overall_percentage),
            "position": term_position or "N/A", "out_of": term_out_of or "N/A",
            "result": "Pass" if overall_percentage >= 50 else "Fail",
            "remarks": term_remarks,
            "conduct": get_body_value(f"conduct_{term_name.lower().replace(' ', '_')}", "Good")
        }
    
    term1_data = await build_term_results("Term 1")
    term2_data = await build_term_results("Term 2")
    term3_data = await build_term_results("Term 3")
    
    all_term_percentages = []
    if term1_data: all_term_percentages.append(term1_data["percentage"])
    if term2_data: all_term_percentages.append(term2_data["percentage"])
    if term3_data: all_term_percentages.append(term3_data["percentage"])
    annual_average = round(sum(all_term_percentages) / len(all_term_percentages), 1) if all_term_percentages else 0
    
    annual_remarks = body.get("annual_remarks", "")
    if not annual_remarks:
        annual_remarks = _generate_remarks(annual_average, is_annual=True)
        next_class = _get_next_class_name(class_name)
        if annual_average >= 50:
            annual_remarks += f" Student will proceed to {next_class} in the next academic year."
        else:
            annual_remarks += f" Student is advised to repeat {class_name} for a stronger foundation."
    
    school = await db.school_info.find_one({}) or {}
    verify_url = f"https://hnsdbapi.vercel.app/verify-report/{student_id_number}"
    
    return {
        "success": True, "message": "Annual report card generated",
        "data": {
            "student": {"name": student_name, "student_id": student_id_number, "class_name": class_name, "conduct": body.get("conduct", "Good")},
            "term1": term1_data, "term2": term2_data, "term3": term3_data,
            "annual_summary": {
                "average_percentage": annual_average, "grade": _calculate_grade(annual_average),
                "remarks": annual_remarks, "result": "Pass" if annual_average >= 50 else "Fail",
                "next_class": _get_next_class_name(class_name) if annual_average >= 50 else class_name,
                "promotion_status": "Promoted" if annual_average >= 50 else "Repeat"
            },
            "academic_year": academic_year, "verify_url": verify_url,
            "is_nursery": is_nursery,
            "school": {
                "name": school.get("school_name", "Heavenly Nature Nursery & Primary School"),
                "address": school.get("address", ""), "phone": school.get("phone", ""),
                "email": school.get("email", ""), "motto": school.get("motto", "Nurturing Right Leaders"),
                "logo_url": school.get("logo_url", "/logo.png")
            }
        }
    }


# =========================================================================
# RESULTS
# =========================================================================

@router.get("/results/{exam_id}")
async def get_results(exam_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get exam results with student list for results entry"""
    db = get_database()
    obj_id = _safe_objectid(exam_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid exam ID")
    exam = await db.exams.find_one({"_id": obj_id})
    if not exam: raise HTTPException(status_code=404, detail="Exam not found")
    
    existing_results = await db.exam_results.find({"exam_id": obj_id}).to_list(length=None)
    existing_results = [parse_mongo_document(r) for r in existing_results]
    
    class_id = exam.get("class_id"); students = []
    if class_id:
        students = await db.students.find({"current_class_id": class_id, "status": "active"}).to_list(length=None)
        students = [parse_mongo_document(s) for s in students]
    
    student_results = []
    for student in students:
        existing = next((r for r in existing_results if str(r.get("student_id")) == str(student.get("_id"))), None)
        student_results.append({
            "student_id": str(student.get("_id")),
            "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
            "score": existing.get("score") if existing else None,
            "remarks": existing.get("remarks", "") if existing else "",
            "grade": existing.get("grade") if existing else None,
        })
    
    scores = [r["score"] for r in existing_results if r.get("score") is not None]
    stats = {
        "total_students": len(students), "results_entered": len(existing_results),
        "highest_score": max(scores) if scores else 0, "lowest_score": min(scores) if scores else 0,
        "average_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "pass_rate": round(sum(1 for r in existing_results if r.get("is_passed")) / len(existing_results) * 100, 2) if existing_results else 0
    }
    
    return {
        "success": True, "message": "Results retrieved",
        "data": {
            "exam_name": exam.get("exam_name", ""), "class_name": exam.get("class_name", ""),
            "subject_name": exam.get("subject_name", exam.get("exam_name", "")),
            "max_score": exam.get("max_score", 100), "pass_mark": exam.get("pass_mark", 50),
            "students": student_results, "results": existing_results, "statistics": stats
        }
    }


@router.delete("/results/{exam_id}")
async def delete_exam_results(exam_id: str = Path(...), current_user: Dict[str, Any] = Depends(require_role("admin"))):
    """Delete all results for an exam"""
    db = get_database()
    obj_id = _safe_objectid(exam_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid exam ID")
    result = await db.exam_results.delete_many({"exam_id": obj_id})
    await db.exams.update_one({"_id": obj_id}, {"$set": {"results_entered": 0, "status": "scheduled", "updated_at": datetime.utcnow()}})
    return {"success": True, "message": f"Deleted {result.deleted_count} results, exam reset to scheduled"}


@router.post("/results/bulk")
async def bulk_record_results(request: Request, current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))):
    """Bulk record exam results"""
    return await record_results(request, current_user)


@router.post("/results")
async def record_results(request: Request, current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))):
    """Record exam results"""
    db = get_database()
    try: body = await request.json()
    except Exception: raise HTTPException(status_code=400, detail="Invalid JSON body")
    exam_id = body.get("exam_id", ""); results = body.get("results", [])
    if not exam_id or not results: raise HTTPException(status_code=400, detail="exam_id and results are required")
    eid = _safe_objectid(exam_id)
    if not eid: raise HTTPException(status_code=400, detail="Invalid exam ID")
    exam = await db.exams.find_one({"_id": eid})
    if not exam: raise HTTPException(status_code=404, detail="Exam not found")
    max_score = exam.get("max_score", 100); pass_mark = exam.get("pass_mark", 50)
    term = exam.get("term", ""); academic_year = exam.get("academic_year", "")
    successful = 0
    for r in results:
        try:
            score = float(r.get("score", 0))
            percentage = (score / max_score) * 100 if max_score > 0 else 0
            grade = _calculate_grade(percentage)
            student_id = _safe_objectid(r.get("student_id"))
            if not student_id: continue
            await db.exam_results.update_one(
                {"exam_id": eid, "student_id": student_id},
                {"$set": {"score": score, "grade": grade, "percentage": round(percentage, 2),
                    "is_passed": score >= pass_mark, "remarks": r.get("remarks", ""),
                    "term": term, "academic_year": academic_year,
                    "recorded_by": _safe_objectid(current_user.get("_id")), "updated_at": datetime.utcnow()}
                }, upsert=True)
            successful += 1
        except Exception as e: print(f"Error recording result: {e}")
    total_results = await db.exam_results.count_documents({"exam_id": eid})
    await db.exams.update_one({"_id": eid}, {"$set": {"results_entered": total_results, "status": "completed", "updated_at": datetime.utcnow()}})
    return {"success": True, "message": f"Recorded {successful} results"}


@router.get("/student/{student_id}")
async def get_student_results(student_id: str, academic_year: Optional[str] = Query(None), current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get exam results for a student"""
    db = get_database()
    sid = _safe_objectid(student_id); student = None; student_oid = None
    if sid: student = await db.students.find_one({"_id": sid}); student_oid = sid
    if not student:
        student = await db.students.find_one({
            "$or": [{"student_id": student_id}, {"student_id_number": student_id},
                    {"id_number": student_id}, {"admission_number": student_id}]
        })
        if student: student_oid = student.get("_id")
    if not student_oid: raise HTTPException(status_code=404, detail="Student not found")
    filter_query = {"student_id": student_oid}
    if academic_year: filter_query["academic_year"] = academic_year
    results = await db.exam_results.find(filter_query).to_list(length=None)
    results = [parse_mongo_document(r) for r in results]
    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else "Unknown"
    student_id_number = _get_student_id_number(student) if student else student_id
    return {"success": True, "message": "Student results retrieved", "data": {"student_id": student_id_number, "student_name": student_name, "results": results, "total": len(results)}}
