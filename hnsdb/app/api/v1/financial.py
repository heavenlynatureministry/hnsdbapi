"""Financial API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse

router = APIRouter()


@router.get("", response_model=SuccessResponse)
@router.get("/", response_model=SuccessResponse)
async def list_transactions(
    type: Optional[str] = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List financial transactions"""
    db = get_database()
    filter_query = {}
    if type: filter_query["transaction_type"] = type
    
    skip = (page - 1) * limit
    total = await db.financial_records.count_documents(filter_query)
    transactions = await db.financial_records.find(filter_query).sort("transaction_date", -1).skip(skip).limit(limit).to_list(length=limit)
    
    for t in transactions:
        t["_id"] = str(t["_id"])
        if t.get("recorded_by"): t["recorded_by"] = str(t["recorded_by"])
        if t.get("related_student_id"): t["related_student_id"] = str(t["related_student_id"])
    
    return SuccessResponse(success=True, message="Transactions retrieved", data={
        "transactions": transactions, "total": total, "page": page, "limit": limit
    })


@router.post("", response_model=SuccessResponse, status_code=201)
@router.post("/", response_model=SuccessResponse, status_code=201)
async def create_transaction(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Record a transaction - accepts raw JSON"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    transaction_date = body.get('transaction_date', '')
    amount = body.get('amount', 0)
    transaction_type = body.get('transaction_type', '')
    category = body.get('category', '')
    description = body.get('description', '')
    
    if not transaction_date or not amount or not transaction_type or not description:
        raise HTTPException(status_code=400, detail="Date, amount, type, and description are required")
    
    try:
        date_obj = datetime.strptime(transaction_date, '%Y-%m-%d')
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    doc = {
        "transaction_date": date_obj,
        "amount": float(amount),
        "transaction_type": transaction_type,
        "category": category,
        "description": description,
        "payment_method": body.get('payment_method', 'cash'),
        "reference_number": f"TXN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "recorded_by": ObjectId(current_user["_id"]),
        "approval_status": "pending",
        "academic_year": body.get('academic_year'),
        "term": body.get('term'),
        "notes": body.get('notes'),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.financial_records.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["recorded_by"] = str(doc["recorded_by"])
    
    return SuccessResponse(success=True, message="Transaction recorded", data=doc)


@router.get("/summary", response_model=SuccessResponse)
async def get_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get financial summary"""
    db = get_database()
    income = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "income", "approval_status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    expenses = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "expense", "approval_status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    total_income = income[0]["total"] if income else 0
    total_expenses = expenses[0]["total"] if expenses else 0
    
    return SuccessResponse(success=True, message="Summary retrieved", data={
        "income": {"total": round(total_income, 2)},
        "expense": {"total": round(total_expenses, 2)},
        "balance": round(total_income - total_expenses, 2)
    })


@router.get("/dashboard", response_model=SuccessResponse)
async def financial_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Financial dashboard"""
    db = get_database()
    summary_data = await get_summary()
    summary = summary_data.data if hasattr(summary_data, 'data') else summary_data.get("data", {})
    pending = await db.financial_records.count_documents({"approval_status": "pending"})
    recent = await db.financial_records.find().sort("created_at", -1).limit(5).to_list(length=5)
    for t in recent: t["_id"] = str(t["_id"])
    
    return SuccessResponse(success=True, message="Dashboard retrieved", data={
        "current_balance": summary.get("balance", 0),
        "total_income_current_term": summary.get("income", {}).get("total", 0),
        "total_expenses_current_term": summary.get("expense", {}).get("total", 0),
        "pending_approvals": pending,
        "recent_transactions": recent
    })


@router.get("/payments", response_model=SuccessResponse)
async def list_payments(
    student_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List payments"""
    db = get_database()
    filter_query = {}
    if student_id: filter_query["student_id"] = ObjectId(student_id)
    
    skip = (page - 1) * limit
    total = await db.payments.count_documents(filter_query)
    payments = await db.payments.find(filter_query).sort("payment_date", -1).skip(skip).limit(limit).to_list(length=limit)
    
    for p in payments:
        p["_id"] = str(p["_id"])
        if p.get("student_id"): p["student_id"] = str(p["student_id"])
        if p.get("fee_structure_id"): p["fee_structure_id"] = str(p["fee_structure_id"])
        if p.get("recorded_by"): p["recorded_by"] = str(p["recorded_by"])
    
    return SuccessResponse(success=True, message="Payments retrieved", data={
        "payments": payments, "total": total, "page": page, "limit": limit
    })


@router.post("/payments", response_model=SuccessResponse, status_code=201)
async def record_payment(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Record a payment - accepts raw JSON"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    student_id = body.get('student_id', '')
    amount_paid = body.get('amount_paid', 0)
    
    if not student_id or not amount_paid:
        raise HTTPException(status_code=400, detail="Student ID and amount are required")
    
    try:
        student_obj_id = ObjectId(student_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    student = await db.students.find_one({"_id": student_obj_id})
    student_name = f"{student['first_name']} {student['last_name']}" if student else "Unknown"
    class_name = ""
    if student and student.get("current_class_id"):
        cls = await db.classes.find_one({"_id": student["current_class_id"]})
        if cls: class_name = cls.get("class_name", "")
    
    doc = {
        "student_id": student_obj_id,
        "student_name": student_name,
        "class_name": class_name,
        "amount_paid": float(amount_paid),
        "payment_method": body.get('payment_method', 'cash'),
        "paid_by": body.get('paid_by', ''),
        "payment_date": datetime.utcnow(),
        "receipt_number": f"RCP-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "status": "completed",
        "recorded_by": ObjectId(current_user["_id"]),
        "academic_year": body.get('academic_year'),
        "term": body.get('term'),
        "notes": body.get('notes'),
        "transaction_reference": body.get('transaction_reference'),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.payments.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["student_id"] = str(doc["student_id"])
    doc["recorded_by"] = str(doc["recorded_by"])
    
    return SuccessResponse(success=True, message="Payment recorded", data=doc)
