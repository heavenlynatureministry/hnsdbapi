"""Reports API - Production Ready"""
from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any
from datetime import datetime

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse

router = APIRouter()


@router.get("/", response_model=SuccessResponse)
async def reports_overview(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Reports overview"""
    return SuccessResponse(success=True, message="Reports ready", data={
        "available": ["enrollment", "staff", "attendance", "academic", "financial", "annual"]
    })


@router.get("/enrollment/summary", response_model=SuccessResponse)
async def enrollment_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Enrollment summary"""
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
    
    return SuccessResponse(success=True, message="Enrollment summary", data={
        "total_active": total,
        "by_gender": {item["_id"]: item["count"] for item in by_gender},
        "by_type": {item["_id"]: item["count"] for item in by_type}
    })


@router.get("/staff/summary", response_model=SuccessResponse)
async def staff_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Staff summary"""
    db = get_database()
    teachers = await db.teachers.count_documents({"status": "active"})
    staff = await db.users.count_documents({"status": "active"})
    return SuccessResponse(success=True, message="Staff summary", data={
        "total_teachers": teachers, "total_staff": staff
    })


@router.get("/attendance/overview", response_model=SuccessResponse)
async def attendance_overview(
    academic_year: Optional[str] = Query(None),
    term: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Attendance overview"""
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
    
    return SuccessResponse(success=True, message="Attendance overview", data={
        "total_records": total,
        "status_summary": summary,
        "attendance_rate": round((present / total * 100), 2) if total > 0 else 0
    })


@router.get("/financial/summary", response_model=SuccessResponse)
async def financial_summary(
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Financial summary"""
    db = get_database()
    match = {"approval_status": "approved"}
    if academic_year: match["academic_year"] = academic_year
    
    income = await db.financial_records.aggregate([
        {"$match": {**match, "transaction_type": "income"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    expenses = await db.financial_records.aggregate([
        {"$match": {**match, "transaction_type": "expense"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    total_income = income[0]["total"] if income else 0
    total_expenses = expenses[0]["total"] if expenses else 0
    
    return SuccessResponse(success=True, message="Financial summary", data={
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(total_income - total_expenses, 2)
    })


@router.get("/comprehensive/annual", response_model=SuccessResponse)
async def annual_report(
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Annual comprehensive report"""
    db = get_database()
    total_students = await db.students.count_documents({"status": "active"})
    total_teachers = await db.teachers.count_documents({"status": "active"})
    total_staff = await db.users.count_documents({"status": "active"})
    
    return SuccessResponse(success=True, message="Annual report generated", data={
        "academic_year": academic_year or f"{datetime.now().year}/{datetime.now().year+1}",
        "enrollment": {"total_students": total_students},
        "staff": {"total_teachers": total_teachers, "total_staff": total_staff},
        "generated_at": datetime.utcnow().isoformat()
    })
