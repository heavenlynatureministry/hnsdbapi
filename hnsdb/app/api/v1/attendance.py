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
    if class_id:
        cid = _safe_objectid(class_id)
        if cid: filter_query["class_id"] = cid
    if date:
        try:
            filter_query["date"] = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    skip = (page - 1) * limit
    total = await db.attendance.count_documents(filter_query)
    records = await db.attendance.find(filter_query).sort("date", -1).skip(skip).limit(limit).to_list(length=limit)
    records = [parse_mongo_document(r) for r in records]
    
    return {
        "success": True, "message": "Attendance retrieved",
        "data": {"records": records, "total": total, "page": page, "limit": limit}
    }


@router.get("/today")
async def get_today_attendance(
    class_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get today's attendance summary"""
    db = get_database()
    today = date.today().strftime("%Y-%m-%d")
    filter_query = {"date": today}
    if class_id:
        cid = _safe_objectid(class_id)
        if cid: filter_query["class_id"] = cid
    
    records = await db.attendance.find(filter_query).to_list(length=None)
    total_students = await db.students.count_documents({"status": "active"})
    if class_id:
        cid = _safe_objectid(class_id)
        if cid:
            total_students = await db.students.count_documents({"current_class_id": cid, "status": "active"})
    
    status_counts = {"present": 0, "absent": 0, "excused": 0, "late": 0}
    for r in records:
        if r["status"] in status_counts: status_counts[r["status"]] += 1
    
    marked = sum(status_counts.values())
    
    return {
        "success": True, "message": "Today's attendance",
        "data": {
            "date": today,
            "total_students": total_students,
            "marked": marked,
            "unmarked": total_students - marked,
            "status_counts": status_counts,
            "attendance_rate": round((status_counts["present"] + status_counts["late"]) / total_students * 100, 2) if total_students > 0 else 0
        }
    }


# =========================================================================
# CLASS ATTENDANCE
# =========================================================================

@router.get("/class/{class_id}")
async def get_attendance_by_class(
    class_id: str = Path(...),
    date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get attendance records for a class on a specific date"""
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    
    class_doc = await db.classes.find_one({"_id": obj_id})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    students = await db.students.find({
        "current_class_id": obj_id, "status": "active"
    }).to_list(length=None)
    
    target_date = date or datetime.utcnow().strftime("%Y-%m-%d")
    
    attendance_records = await db.attendance.find({
        "class_id": obj_id, "date": target_date
    }).to_list(length=None)
    
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
            "gender": student.get("gender"),
        })
    
    stats = {"present": 0, "absent": 0, "excused": 0, "late": 0, "unmarked": 0}
    for s in student_list:
        stats[s["status"]] = stats.get(s["status"], 0) + 1
    
    total = len(student_list)
    attendance_rate = round((stats["present"] + stats["late"]) / total * 100, 1) if total > 0 else 0
    
    return {
        "success": True, "message": "Attendance retrieved",
        "data": {
            "class_id": class_id,
            "class_name": class_doc.get("class_name"),
            "date": target_date,
            "students": student_list,
            "total": total,
            "statistics": stats,
            "attendance_rate": attendance_rate
        }
    }


@router.delete("/class/{class_id}/date/{attendance_date}")
async def delete_class_attendance_by_date(
    class_id: str = Path(...),
    attendance_date: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete all attendance records for a class on a specific date"""
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    
    try:
        datetime.strptime(attendance_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    result = await db.attendance.delete_many({
        "class_id": obj_id, "date": attendance_date
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No attendance records found for this class and date")
    
    await db.audit_log.insert_one({
        "table_name": "attendance",
        "record_id": f"{class_id}_{attendance_date}",
        "operation": "DELETE_BULK",
        "changed_by": current_user.get("_id"),
        "details": {"class_id": class_id, "date": attendance_date, "deleted_count": result.deleted_count},
        "changed_at": datetime.utcnow()
    })
    
    return {"success": True, "message": f"Deleted {result.deleted_count} attendance records"}


# =========================================================================
# STUDENT ATTENDANCE
# =========================================================================

@router.get("/student/{student_id}")
async def get_student_attendance(
    student_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get attendance history for a student"""
    db = get_database()
    
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    filter_query = {"student_id": sid}
    
    if start_date:
        filter_query["date"] = {"$gte": start_date}
    if end_date:
        if "date" not in filter_query or not isinstance(filter_query["date"], dict):
            filter_query["date"] = {}
        filter_query["date"]["$lte"] = end_date
    
    records = await db.attendance.find(filter_query).sort("date", -1).limit(100).to_list(length=100)
    records = [parse_mongo_document(r) for r in records]
    
    total = len(records)
    present = sum(1 for r in records if r.get("status") in ["present", "late"])
    
    student = await db.students.find_one({"_id": sid})
    
    return {
        "success": True, "message": "Student attendance retrieved",
        "data": {
            "student_id": student_id,
            "student_name": f"{student['first_name']} {student['last_name']}" if student else "Unknown",
            "records": records,
            "total": total,
            "summary": {
                "present": present,
                "absent": sum(1 for r in records if r.get("status") == "absent"),
                "excused": sum(1 for r in records if r.get("status") == "excused"),
                "late": sum(1 for r in records if r.get("status") == "late"),
                "attendance_rate": round((present / total * 100), 2) if total > 0 else 0
            }
        }
    }


# =========================================================================
# MARK ATTENDANCE
# =========================================================================

@router.post("/mark")
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
    records = body.get("records", body.get("attendance_data", []))
    
    if not class_id or not attendance_date or not records:
        raise HTTPException(status_code=400, detail="class_id, date, and records are required")
    
    cid = _safe_objectid(class_id)
    if not cid:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    
    successful = 0
    for record in records:
        try:
            sid = _safe_objectid(record.get("student_id"))
            if not sid:
                continue
            
            await db.attendance.update_one(
                {"student_id": sid, "class_id": cid, "date": attendance_date},
                {"$set": {
                    "status": record.get("status", "present"),
                    "notes": record.get("notes", ""),
                    "recorded_by": current_user.get("_id"),
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
            successful += 1
        except Exception:
            pass
    
    return {"success": True, "message": f"Marked {successful} students"}


# =========================================================================
# ATTENDANCE REPORTS
# =========================================================================

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
        cid = _safe_objectid(class_id)
        if cid:
            filter_query["class_id"] = cid
        else:
            raise HTTPException(status_code=400, detail="Invalid class ID")
    
    # Filter by month (date starts with YYYY-MM)
    filter_query["date"] = {"$regex": f"^{month}"}
    
    records = await db.attendance.find(filter_query).to_list(length=None)
    records = [parse_mongo_document(r) for r in records]
    
    daily_stats = {}
    for record in records:
        rec_date = record.get("date", "")
        status = record.get("status", "unmarked")
        if rec_date not in daily_stats:
            daily_stats[rec_date] = {"present": 0, "absent": 0, "excused": 0, "late": 0, "total": 0}
        daily_stats[rec_date][status] = daily_stats[rec_date].get(status, 0) + 1
        daily_stats[rec_date]["total"] += 1
    
    report = []
    for rec_date, stats in sorted(daily_stats.items()):
        rate = round((stats["present"] + stats["late"]) / stats["total"] * 100, 1) if stats["total"] > 0 else 0
        report.append({
            "date": rec_date,
            "present": stats["present"],
            "absent": stats["absent"],
            "excused": stats["excused"],
            "late": stats["late"],
            "total": stats["total"],
            "attendance_rate": rate
        })
    
    return {
        "success": True, "message": "Report generated",
        "data": {
            "month": month,
            "total_records": len(records),
            "daily_report": report
        }
    }


# =========================================================================
# ANALYTICS
# =========================================================================

@router.get("/analytics/overview")
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
    pipeline.append({"$group": {"_id": "$status", "count": {"$sum": 1}}})
    
    results = await db.attendance.aggregate(pipeline).to_list(length=None)
    
    summary = {}
    total = 0
    for r in results:
        summary[r["_id"]] = r["count"]
        total += r["count"]
    
    present = summary.get("present", 0) + summary.get("late", 0)
    
    return {
        "success": True, "message": "Analytics retrieved",
        "data": {
            "total_records": total,
            "status_summary": summary,
            "attendance_rate": round((present / total * 100), 2) if total > 0 else 0
        }
    }


# =========================================================================
# COMPARE & HEATMAP
# =========================================================================

@router.get("/compare-classes")
async def compare_classes(
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Compare attendance across classes"""
    db = get_database()
    
    classes = await db.classes.find({"status": "active"}).to_list(length=None)
    
    comparison = []
    for cls in classes:
        cid = cls["_id"]
        match = {"class_id": cid}
        if academic_year: match["academic_year"] = academic_year
        
        records = await db.attendance.find(match).to_list(length=None)
        total = len(records)
        present = sum(1 for r in records if r.get("status") in ["present", "late"])
        
        comparison.append({
            "class_id": str(cid),
            "class_name": cls.get("class_name", ""),
            "class_level": cls.get("class_level", ""),
            "total_records": total,
            "present_count": present,
            "attendance_rate": round((present / total * 100), 1) if total > 0 else 0
        })
    
    return {
        "success": True, "message": "Class comparison retrieved",
        "data": {"classes": comparison}
    }


@router.get("/heatmap/{class_id}")
async def attendance_heatmap(
    class_id: str,
    month: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get attendance heatmap data for a class"""
    db = get_database()
    
    cid = _safe_objectid(class_id)
    if not cid:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    
    target_month = month or datetime.utcnow().strftime("%Y-%m")
    
    records = await db.attendance.find({
        "class_id": cid,
        "date": {"$regex": f"^{target_month}"}
    }).to_list(length=None)
    
    students = await db.students.find({
        "current_class_id": cid, "status": "active"
    }).to_list(length=None)
    
    # Build heatmap data: { student_name: { date: status } }
    heatmap = {}
    for student in students:
        sid = str(student["_id"])
        name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
        heatmap[sid] = {"name": name, "attendance": {}}
    
    for record in records:
        sid = str(record.get("student_id", ""))
        rec_date = record.get("date", "")
        status = record.get("status", "unmarked")
        if sid in heatmap:
            heatmap[sid]["attendance"][rec_date] = status
    
    return {
        "success": True, "message": "Heatmap data retrieved",
        "data": {
            "class_id": class_id,
            "month": target_month,
            "students": list(heatmap.values())
        }
    }


# =========================================================================
# DELETE RECORDS
# =========================================================================

@router.delete("/records/{record_id}")
async def delete_attendance_record(
    record_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete a single attendance record"""
    db = get_database()
    
    obj_id = _safe_objectid(record_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid record ID")
    
    result = await db.attendance.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    return {"success": True, "message": "Attendance record deleted"}
