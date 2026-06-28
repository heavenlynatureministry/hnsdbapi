"""Attendance API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request, Path
from typing import Optional, Dict, Any, List
from datetime import date, datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse
from app.utils.helpers import parse_mongo_document

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
    
    records = [parse_mongo_document(r) for r in records]
    
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
    try:
        parsed_date = datetime.strptime(attendance_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    filter_query = {
        "class_id": ObjectId(class_id),
        "date": datetime.combine(parsed_date, datetime.min.time())
    }
    
    records = await db.attendance.find(filter_query).to_list(length=None)
    students = await db.students.find({
        "current_class_id": ObjectId(class_id), "status": "active"
    }).sort("last_name", 1).to_list(length=None)
    
    records = [parse_mongo_document(r) for r in records]
    attendance_lookup = {r["student_id"]: r for r in records}
    
    student_list = []
    present_count = 0
    absent_count = 0
    
    for s in students:
        s = parse_mongo_document(s)
        sid = s["_id"]
        record = attendance_lookup.get(sid)
        status = record["status"] if record else "unmarked"
        
        if status == "present" or status == "late": present_count += 1
        if status == "absent": absent_count += 1
        
        student_list.append({
            "student_id": sid,
            "student_name": f"{s.get('first_name', '')} {s.get('last_name', '')}",
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
    records = [parse_mongo_document(r) for r in records]
    
    total = len(records)
    present = sum(1 for r in records if r.get("status") in ["present", "late"])
    absent = sum(1 for r in records if r.get("status") == "absent")
    
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    
    return SuccessResponse(success=True, message="Student attendance retrieved", data={
        "student_id": student_id,
        "student_name": f"{student['first_name']} {student['last_name']}" if student else "Unknown",
        "records": records,
        "total": total,
        "summary": {
            "present": present,
            "absent": absent,
            "excused": sum(1 for r in records if r.get("status") == "excused"),
            "late": sum(1 for r in records if r.get("status") == "late"),
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


@router.delete("/records/{record_id}", response_model=SuccessResponse)
async def delete_attendance_record(
    record_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete a single attendance record (admin only)"""
    db = get_database()
    
    result = await db.attendance.delete_one({"_id": ObjectId(record_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    return SuccessResponse(success=True, message="Attendance record deleted")


@router.delete("/class/{class_id}/date/{attendance_date}", response_model=SuccessResponse)
async def delete_class_attendance_by_date(
    class_id: str = Path(...),
    attendance_date: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete all attendance records for a class on a specific date (admin only)"""
    db = get_database()
    
    try:
        parsed_date = datetime.strptime(attendance_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    date_obj = datetime.combine(parsed_date, datetime.min.time())
    
    result = await db.attendance.delete_many({
        "class_id": ObjectId(class_id),
        "date": date_obj
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No attendance records found for this class and date")
    
    # Log the deletion
    await db.audit_log.insert_one({
        "table_name": "attendance",
        "record_id": f"{class_id}_{attendance_date}",
        "operation": "DELETE_BULK",
        "changed_by": ObjectId(current_user["_id"]) if current_user.get("_id") else None,
        "details": {"class_id": class_id, "date": attendance_date, "deleted_count": result.deleted_count},
        "changed_at": datetime.utcnow()
    })
    
    return SuccessResponse(success=True, message=f"Deleted {result.deleted_count} attendance records")


add this and update the file
@router.get("/class/{class_id}")
async def get_attendance_by_class(
    class_id: str = Path(...),
    date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get attendance records for a class"""
    db = get_database()
    
    try:
        obj_id = ObjectId(class_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    
    # Get class info
    class_doc = await db.classes.find_one({"_id": obj_id})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get students in class
    students = await db.students.find({
        "current_class_id": obj_id,
        "status": "active"
    }).to_list(length=None)
    
    # Get attendance for the date
    target_date = date or datetime.utcnow().strftime("%Y-%m-%d")
    
    attendance_records = await db.attendance.find({
        "class_id": obj_id,
        "date": target_date
    }).to_list(length=None)
    
    # Map attendance to students
    attendance_map = {}
    for record in attendance_records:
        sid = str(record.get("student_id", ""))
        attendance_map[sid] = record.get("status", "unmarked")
    
    student_list = []
    for student in students:
        sid = str(student["_id"])
        student_list.append({
            "student_id": sid,
            "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
            "status": attendance_map.get(sid, "unmarked"),
        })
    
    # Calculate statistics
    stats = {"present": 0, "absent": 0, "excused": 0, "late": 0, "unmarked": 0}
    for s in student_list:
        stats[s["status"]] = stats.get(s["status"], 0) + 1
    
    total = len(student_list)
    marked = total - stats["unmarked"]
    attendance_rate = round((stats["present"] + stats["late"]) / total * 100, 1) if total > 0 else 0
    
    return {
        "success": True,
        "message": "Attendance retrieved",
        "data": {
            "class_name": class_doc.get("class_name"),
            "date": target_date,
            "students": student_list,
            "statistics": stats,
            "attendance_rate": attendance_rate
        }
    }



@router.post("/reports/generate")
async def generate_attendance_report(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate attendance report"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        body = {}
    
    class_id = body.get("class_id")
    month = body.get("month", datetime.utcnow().strftime("%Y-%m"))
    
    filter_query = {}
    if class_id:
        try:
            filter_query["class_id"] = ObjectId(class_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid class ID")
    
    # Filter by month
    filter_query["date"] = {"$regex": f"^{month}"}
    
    records = await db.attendance.find(filter_query).to_list(length=None)
    
    # Generate report data
    daily_stats = {}
    for record in records:
        date = record.get("date", "")
        status = record.get("status", "unmarked")
        if date not in daily_stats:
            daily_stats[date] = {"present": 0, "absent": 0, "excused": 0, "late": 0, "total": 0}
        daily_stats[date][status] = daily_stats[date].get(status, 0) + 1
        daily_stats[date]["total"] += 1
    
    report = []
    for date, stats in sorted(daily_stats.items()):
        rate = round((stats["present"] + stats["late"]) / stats["total"] * 100, 1) if stats["total"] > 0 else 0
        report.append({
            "date": date,
            "present": stats["present"],
            "absent": stats["absent"],
            "excused": stats["excused"],
            "late": stats["late"],
            "total": stats["total"],
            "attendance_rate": rate
        })
    
    return {
        "success": True,
        "message": "Report generated",
        "data": {
            "month": month,
            "total_records": len(records),
            "daily_report": report
        }
    }
