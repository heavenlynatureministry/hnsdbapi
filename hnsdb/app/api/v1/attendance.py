"""Attendance API"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from datetime import date, datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse

router = APIRouter()

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
    records = await db.attendance.find(filter_query).skip(skip).limit(limit).to_list(length=limit)
    
    for r in records:
        r["_id"] = str(r["_id"])
        r["student_id"] = str(r["student_id"])
        r["class_id"] = str(r["class_id"])
    
    return SuccessResponse(success=True, message="Attendance retrieved", data={"records": records, "total": total})

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
    if class_id: total_students = await db.students.count_documents({"current_class_id": ObjectId(class_id), "status": "active"})
    
    status_counts = {"present": 0, "absent": 0, "excused": 0, "late": 0}
    for r in records:
        if r["status"] in status_counts: status_counts[r["status"]] += 1
    
    marked = sum(status_counts.values())
    return SuccessResponse(success=True, message="Today's attendance", data={
        "date": str(date.today()), "total_students": total_students,
        "marked": marked, "unmarked": total_students - marked,
        "status_counts": status_counts,
        "attendance_rate": round((status_counts["present"] + status_counts["late"]) / total_students * 100, 2) if total_students > 0 else 0
    })

@router.get("/class/{class_id}", response_model=SuccessResponse)
async def get_class_attendance(
    class_id: str,
    date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get attendance for a class"""
    db = get_database()
    attendance_date = date or str(date.today())
    filter_query = {
        "class_id": ObjectId(class_id),
        "date": datetime.combine(datetime.strptime(attendance_date, "%Y-%m-%d").date(), datetime.min.time())
    }
    
    records = await db.attendance.find(filter_query).to_list(length=None)
    students = await db.students.find({"current_class_id": ObjectId(class_id), "status": "active"}).to_list(length=None)
    
    attendance_lookup = {str(r["student_id"]): r["status"] for r in records}
    
    student_list = []
    for s in students:
        sid = str(s["_id"])
        status = attendance_lookup.get(sid, "unmarked")
        student_list.append({
            "student_id": sid, "student_name": f"{s['first_name']} {s['last_name']}",
            "status": status, "gender": s.get("gender")
        })
    
    return SuccessResponse(success=True, message="Class attendance", data={"students": student_list, "total": len(student_list)})

@router.post("/mark", response_model=SuccessResponse)
async def mark_attendance(
    class_id: str = Body(...),
    attendance_date: str = Body(...),
    records: List[Dict[str, Any]] = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("admin", "teacher"))
):
    """Mark attendance for multiple students"""
    db = get_database()
    date_obj = datetime.combine(datetime.strptime(attendance_date, "%Y-%m-%d").date(), datetime.min.time())
    
    successful = 0
    for record in records:
        try:
            await db.attendance.update_one(
                {"student_id": ObjectId(record["student_id"]), "class_id": ObjectId(class_id), "date": date_obj},
                {"$set": {"status": record["status"], "notes": record.get("notes", ""), "recorded_by": current_user["_id"], "updated_at": datetime.utcnow()}},
                upsert=True
            )
            successful += 1
        except Exception: pass
    
    return SuccessResponse(success=True, message=f"Marked {successful} students")
