"""Financial API"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse

router = APIRouter()

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
    
    return SuccessResponse(success=True, message="Transactions retrieved", data={"transactions": transactions, "total": total})

@router.post("/", response_model=SuccessResponse, status_code=201)
async def create_transaction(
    transaction_date: str = Body(...),
    amount: float = Body(...),
    transaction_type: str = Body(...),
    category: str = Body(...),
    description: str = Body(...),
    payment_method: str = Body("cash"),
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Record a transaction"""
    db = get_database()
    doc = {
        "transaction_date": datetime.strptime(transaction_date, "%Y-%m-%d"),
        "amount": amount, "transaction_type": transaction_type,
        "category": category, "description": description,
        "payment_method": payment_method,
        "reference_number": f"TXN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "recorded_by": ObjectId(current_user["_id"]),
        "approval_status": "pending", "created_at": datetime.utcnow()
    }
    result = await db.financial_records.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
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
        "total_income": total_income, "total_expenses": total_expenses,
        "balance": total_income - total_expenses
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
        p["student_id"] = str(p["student_id"])
        if p.get("fee_structure_id"): p["fee_structure_id"] = str(p["fee_structure_id"])
    
    return SuccessResponse(success=True, message="Payments retrieved", data={"payments": payments, "total": total})

@router.post("/payments", response_model=SuccessResponse, status_code=201)
async def record_payment(
    student_id: str = Body(...),
    amount_paid: float = Body(...),
    payment_method: str = Body("cash"),
    paid_by: str = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Record a payment"""
    db = get_database()
    doc = {
        "student_id": ObjectId(student_id),
        "amount_paid": amount_paid, "payment_method": payment_method,
        "paid_by": paid_by, "payment_date": datetime.utcnow(),
        "receipt_number": f"RCP-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "status": "completed", "recorded_by": ObjectId(current_user["_id"]),
        "created_at": datetime.utcnow()
    }
    result = await db.payments.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["student_id"] = str(doc["student_id"])
    return SuccessResponse(success=True, message="Payment recorded", data=doc)
