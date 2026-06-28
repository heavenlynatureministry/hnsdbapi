"""Reports API - Production Ready"""
from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any
from datetime import datetime

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse
from app.utils.helpers import parse_mongo_document

router = APIRouter()


def _get_current_academic_year() -> str:
    """Calculate current academic year dynamically."""
    now = datetime.utcnow()
    year = now.year
    month = now.month
    start_year = year - 1 if month == 1 else year
    return f"{start_year}/{start_year + 1}"


def _get_current_term() -> str:
    """Calculate current term dynamically."""
    month = datetime.utcnow().month
    if 2 <= month <= 4: return "Term 1"
    elif 5 <= month <= 7: return "Term 2"
    elif 9 <= month <= 11: return "Term 3"
    elif month == 8: return "Term 2 Break"
    else: return "Annual Break"


@router.get("")
@router.get("/")
async def reports_overview(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Reports overview"""
    return {
        "success": True,
        "message": "Reports ready",
        "data": {
            "academic_year": _get_current_academic_year(),
            "current_term": _get_current_term(),
            "available": ["enrollment", "staff", "attendance", "financial", "annual"]
        }
    }


@router.get("/enrollment/summary")
async def enrollment_summary(
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Enrollment summary"""
    db = get_database()
    year = academic_year or _get_current_academic_year()
    
    total = await db.students.count_documents({"status": "active"})
    by_gender = await db.students.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$gender", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    by_type = await db.students.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$student_type", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    by_class = await db.students.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$current_class_id", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    
    # Get class names for the by_class grouping
    class_enrollment = []
    for item in by_class:
        if item["_id"]:
            cls = await db.classes.find_one({"_id": item["_id"]})
            class_name = cls.get("class_name", "Unknown") if cls else "Unknown"
            class_level = cls.get("class_level", "") if cls else ""
            class_enrollment.append({
                "class_id": str(item["_id"]),
                "class_name": class_name,
                "class_level": class_level,
                "count": item["count"]
            })
    
    # New enrollments this academic year
    new_enrollments = await db.students.count_documents({
        "status": "active",
        "academic_year": year
    })
    
    return {
        "success": True,
        "message": "Enrollment summary retrieved",
        "data": {
            "academic_year": year,
            "total_active": total,
            "new_enrollments": new_enrollments,
            "by_gender": {item["_id"]: item["count"] for item in by_gender},
            "by_type": {item["_id"]: item["count"] for item in by_type},
            "by_class": class_enrollment
        }
    }


@router.get("/staff/summary")
async def staff_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Staff summary"""
    db = get_database()
    teachers = await db.teachers.count_documents({"status": "active"})
    total_staff = await db.users.count_documents({"status": "active"})
    
    by_qualification = await db.teachers.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$qualification", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    
    by_gender = await db.teachers.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$gender", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    
    return {
        "success": True,
        "message": "Staff summary retrieved",
        "data": {
            "academic_year": _get_current_academic_year(),
            "total_teachers": teachers,
            "total_staff": total_staff,
            "by_qualification": {item["_id"]: item["count"] for item in by_qualification},
            "by_gender": {item["_id"]: item["count"] for item in by_gender}
        }
    }


@router.get("/attendance/overview")
async def attendance_overview(
    academic_year: Optional[str] = Query(None),
    term: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Attendance overview"""
    db = get_database()
    year = academic_year or _get_current_academic_year()
    
    match = {"academic_year": year}
    if term: match["term"] = term
    
    pipeline = [{"$match": match}]
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
    
    # Monthly breakdown
    monthly_pipeline = [
        {"$match": match},
        {"$project": {
            "month": {"$substr": ["$date", 0, 7]},
            "status": 1
        }},
        {"$group": {
            "_id": {"month": "$month", "status": "$status"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.month": 1}}
    ]
    monthly_results = await db.attendance.aggregate(monthly_pipeline).to_list(length=None)
    
    monthly = {}
    for r in monthly_results:
        m = r["_id"]["month"]
        s = r["_id"]["status"]
        if m not in monthly:
            monthly[m] = {"present": 0, "absent": 0, "excused": 0, "late": 0, "total": 0}
        monthly[m][s] = r["count"]
        monthly[m]["total"] += r["count"]
    
    return {
        "success": True,
        "message": "Attendance overview retrieved",
        "data": {
            "academic_year": year,
            "term": term or "All Terms",
            "total_records": total,
            "status_summary": summary,
            "attendance_rate": round((present / total * 100), 2) if total > 0 else 0,
            "monthly_breakdown": monthly
        }
    }


@router.get("/financial/summary")
async def financial_summary(
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Financial summary"""
    db = get_database()
    year = academic_year or _get_current_academic_year()
    
    match = {"approval_status": {"$in": ["approved", "completed"]}, "academic_year": year}
    
    income = await db.financial_records.aggregate([
        {"$match": {**match, "transaction_type": "income"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    expenses = await db.financial_records.aggregate([
        {"$match": {**match, "transaction_type": "expense"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    # Income by category
    income_by_cat = await db.financial_records.aggregate([
        {"$match": {**match, "transaction_type": "income"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]).to_list(length=None)
    
    # Expenses by category
    expenses_by_cat = await db.financial_records.aggregate([
        {"$match": {**match, "transaction_type": "expense"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]).to_list(length=None)
    
    total_income = income[0]["total"] if income else 0
    total_expenses = expenses[0]["total"] if expenses else 0
    
    # Payment summary
    total_payments = await db.payments.count_documents({"academic_year": year})
    payment_total = await db.payments.aggregate([
        {"$match": {"academic_year": year, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}}
    ]).to_list(length=1)
    
    return {
        "success": True,
        "message": "Financial summary retrieved",
        "data": {
            "academic_year": year,
            "total_income": round(total_income, 2),
            "total_expenses": round(total_expenses, 2),
            "balance": round(total_income - total_expenses, 2),
            "income_by_category": {item["_id"]: round(item["total"], 2) for item in income_by_cat} if income_by_cat else {},
            "expenses_by_category": {item["_id"]: round(item["total"], 2) for item in expenses_by_cat} if expenses_by_cat else {},
            "payments": {
                "total_count": total_payments,
                "total_collected": round(payment_total[0]["total"], 2) if payment_total else 0
            }
        }
    }


@router.get("/comprehensive/annual")
async def annual_report(
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Annual comprehensive report"""
    db = get_database()
    year = academic_year or _get_current_academic_year()
    
    # Student stats
    total_students = await db.students.count_documents({"status": "active"})
    new_students = await db.students.count_documents({"status": "active", "academic_year": year})
    
    # Staff stats
    total_teachers = await db.teachers.count_documents({"status": "active"})
    total_staff = await db.users.count_documents({"status": "active"})
    
    # Attendance stats
    attendance_total = await db.attendance.count_documents({"academic_year": year})
    attendance_present = await db.attendance.count_documents({
        "academic_year": year, "status": {"$in": ["present", "late"]}
    })
    
    # Financial stats
    income = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "income", "approval_status": {"$in": ["approved", "completed"]}, "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    expenses = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "expense", "approval_status": {"$in": ["approved", "completed"]}, "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    # Class stats
    total_classes = await db.classes.count_documents({"status": "active", "academic_year": year})
    class_enrollment = await db.classes.aggregate([
        {"$match": {"status": "active", "academic_year": year}},
        {"$group": {"_id": None, "total_enrollment": {"$sum": "$current_enrollment"}, "total_capacity": {"$sum": "$max_capacity"}}}
    ]).to_list(length=1)
    
    enrollment_total = class_enrollment[0]["total_enrollment"] if class_enrollment else 0
    capacity_total = class_enrollment[0]["total_capacity"] if class_enrollment else 0
    
    return {
        "success": True,
        "message": "Annual report generated",
        "data": {
            "academic_year": year,
            "current_term": _get_current_term(),
            "generated_at": datetime.utcnow().isoformat(),
            "enrollment": {
                "total_students": total_students,
                "new_enrollments": new_students,
                "total_classes": total_classes,
                "total_capacity": capacity_total,
                "occupancy_rate": round((enrollment_total / capacity_total * 100), 1) if capacity_total > 0 else 0
            },
            "staff": {
                "total_teachers": total_teachers,
                "total_staff": total_staff,
                "student_teacher_ratio": round(total_students / total_teachers, 1) if total_teachers > 0 else 0
            },
            "attendance": {
                "total_records": attendance_total,
                "present_count": attendance_present,
                "attendance_rate": round((attendance_present / attendance_total * 100), 1) if attendance_total > 0 else 0
            },
            "financial": {
                "total_income": round(income[0]["total"], 2) if income else 0,
                "total_expenses": round(expenses[0]["total"], 2) if expenses else 0,
                "balance": round((income[0]["total"] if income else 0) - (expenses[0]["total"] if expenses else 0), 2)
            }
        }
    }
