"""Attendance API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from typing import Optional, Dict, Any, List
from datetime import date, datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse

router = APIRouter()


@router.get("", response_model=SuccessResponse)
@router.get("/", response_model=SuccessResponse)
async def list_attendance(
    class_id: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List attendance records"""
    db = get_database()
    filter_query = {}
    if class_id: filter_query["class_id"] = ObjectId(class_id)
    if date: filter_query["date"] = datetime.combine(datetime.strptime(date, "%Y-%m-%d").date(), datetime.min.time())
    
    skip = (page - 1) * limit
    total = await db.attendance.count_documents(filter_query)
    records = await db.attendance.find(filter_query).sort("date", -1).skip(skip).limit(limit).to_list(length=limit)
    
    for r in records:
        r["_id"] = str(r["_id"])
        r["student_id"] = str(r["student_id"])
        r["class_id"] = str(r["class_id"])
        if r.get("recorded_by"): r["recorded_by"] = str(r["recorded_by"])
    
    return SuccessResponse(success=True, message="Attendance retrieved", data={
        "records": records, "total": total, "page": page, "limit": limit
    })


@router.get("/today", response_model=SuccessResponse)
async def get_today_attendance(
    class_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get today's attendance summary"""
    db = get_database()
    today = datetime.combine(date.today(), datetime.min.time())
    filter_query = {"date": today}
    if class_id: filter_query["class_id"] = ObjectId(class_id)
    
    records = await db.attendance.find(filter_query).to_list(length=None)
    total_students = await db.students.count_documents({"status": "active"})
    if class_id: total_students = await db.students.count_documents({
        "current_class_id": ObjectId(class_id), "status": "active"
    })
    
    status_counts = {"present": 0, "absent": 0, "excused": 0, "late": 0}
    for r in records:
        if r["status"] in status_counts: status_counts[r["status"]] += 1
    
    marked = sum(status_counts.values())
    
    return SuccessResponse(success=True, message="Today's attendance", data={
        "date": str(date.today()),
        "total_students": total_students,
        "marked": marked,
        "unmarked": total_students - marked,
        "status_counts": status_counts,
        "attendance_rate": round(
            (status_counts["present"] + status_counts["late"]) / total_students * 100, 2
        ) if total_students > 0 else 0
    })


@router.get("/class/{class_id}", response_model=SuccessResponse)
async def get_class_attendance(
    class_id: str,
    date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get attendance for a class on a specific date"""
    db = get_database()
    attendance_date = date or str(date.today())
    filter_query = {
        "class_id": ObjectId(class_id),
        "date": datetime.combine(datetime.strptime(attendance_date, "%Y-%m-%d").date(), datetime.min.time())
    }
    
    records = await db.attendance.find(filter_query).to_list(length=None)
    students = await db.students.find({
        "current_class_id": ObjectId(class_id), "status": "active"
    }).sort("last_name", 1).to_list(length=None)
    
    attendance_lookup = {str(r["student_id"]): r for r in records}
    
    student_list = []
    present_count = 0
    absent_count = 0
    
    for s in students:
        sid = str(s["_id"])
        record = attendance_lookup.get(sid)
        status = record["status"] if record else "unmarked"
        
        if status == "present" or status == "late": present_count += 1
        if status == "absent": absent_count += 1
        
        student_list.append({
            "student_id": sid,
            "student_name": f"{s['first_name']} {s['last_name']}",
            "status": status,
            "gender": s.get("gender"),
            "notes": record.get("notes", "") if record else ""
        })
    
    return SuccessResponse(success=True, message="Class attendance", data={
        "class_id": class_id,
        "date": attendance_date,
        "students": student_list,
        "total": len(student_list),
        "statistics": {
            "present": present_count,
            "absent": absent_count,
            "unmarked": len(student_list) - present_count - absent_count,
            "attendance_rate": round(present_count / len(student_list) * 100, 2) if student_list else 0
        }
    })


@router.get("/student/{student_id}", response_model=SuccessResponse)
async def get_student_attendance(
    student_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get attendance history for a student"""
    db = get_database()
    filter_query = {"student_id": ObjectId(student_id)}
    
    if start_date:
        if "date" not in filter_query: filter_query["date"] = {}
        filter_query["date"]["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
    if end_date:
        if "date" not in filter_query: filter_query["date"] = {}
        filter_query["date"]["$lte"] = datetime.strptime(end_date, "%Y-%m-%d")
    
    records = await db.attendance.find(filter_query).sort("date", -1).limit(100).to_list(length=100)
    
    for r in records:
        r["_id"] = str(r["_id"])
        r["student_id"] = str(r["student_id"])
        r["class_id"] = str(r["class_id"])
    
    total = len(records)
    present = sum(1 for r in records if r["status"] in ["present", "late"])
    absent = sum(1 for r in records if r["status"] == "absent")
    
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    
    return SuccessResponse(success=True, message="Student attendance retrieved", data={
        "student_id": student_id,
        "student_name": f"{student['first_name']} {student['last_name']}" if student else "Unknown",
        "records": records,
        "total": total,
        "summary": {
            "present": present,
            "absent": absent,
            "excused": sum(1 for r in records if r["status"] == "excused"),
            "late": sum(1 for r in records if r["status"] == "late"),
            "attendance_rate": round((present / total * 100), 2) if total > 0 else 0
        }
    })


@router.post("/mark", response_model=SuccessResponse)
async def mark_attendance(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))
):
    """Mark attendance for multiple students"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    class_id = body.get("class_id", "")
    attendance_date = body.get("date", "")
    records = body.get("records", [])
    
    if not class_id or not attendance_date or not records:
        raise HTTPException(status_code=400, detail="class_id, date, and records are required")
    
    try:
        date_obj = datetime.combine(datetime.strptime(attendance_date, "%Y-%m-%d").date(), datetime.min.time())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    successful = 0
    for record in records:
        try:
            await db.attendance.update_one(
                {
                    "student_id": ObjectId(record["student_id"]),
                    "class_id": ObjectId(class_id),
                    "date": date_obj
                },
                {"$set": {
                    "status": record.get("status", "present"),
                    "notes": record.get("notes", ""),
                    "recorded_by": ObjectId(current_user["_id"]),
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
            successful += 1
        except Exception:
            pass
    
    return SuccessResponse(success=True, message=f"Marked {successful} students")


@router.get("/analytics/overview", response_model=SuccessResponse)
async def attendance_analytics(
    academic_year: Optional[str] = Query(None),
    term: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Get attendance analytics"""
    db = get_database()
    match = {}
    if academic_year: match["academic_year"] = academic_year
    if term: match["term"] = term
    
    pipeline = [{"$match": match}] if match else []
    pipeline.append({
        "$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }
    })
    
    results = await db.attendance.aggregate(pipeline).to_list(length=None)
    
    summary = {}
    total = 0
    for r in results:
        summary[r["_id"]] = r["count"]
        total += r["count"]
    
    present = summary.get("present", 0) + summary.get("late", 0)
    
    return SuccessResponse(success=True, message="Analytics retrieved", data={
        "total_records": total,
        "status_summary": summary,
        "attendance_rate": round((present / total * 100), 2) if total > 0 else 0
    })
