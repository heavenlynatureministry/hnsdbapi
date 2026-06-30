"""Financial API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request, Path
from typing import Optional, Dict, Any
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


def _get_current_term() -> str:
    """Calculate current term dynamically."""
    month = datetime.utcnow().month
    if 2 <= month <= 4: return "Term 1"
    elif 5 <= month <= 7: return "Term 2"
    elif 9 <= month <= 11: return "Term 3"
    elif month == 8: return "Term 2 Break"
    else: return "Annual Break"


def _number_to_words(amount: float) -> str:
    """Convert number to words for receipt."""
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
    teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", 
             "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    thousands = ["", "Thousand", "Million", "Billion"]
    
    def convert_less_than_thousand(n: int) -> str:
        if n == 0:
            return ""
        elif n < 10:
            return ones[n]
        elif n < 20:
            return teens[n - 10]
        elif n < 100:
            return tens[n // 10] + (" " + ones[n % 10] if n % 10 != 0 else "")
        else:
            return ones[n // 100] + " Hundred" + (" and " + convert_less_than_thousand(n % 100) if n % 100 != 0 else "")
    
    def convert_integer(n: int) -> str:
        if n == 0:
            return "Zero"
        
        result = ""
        thousand_counter = 0
        
        while n > 0:
            if n % 1000 != 0:
                prefix = convert_less_than_thousand(n % 1000)
                if thousand_counter > 0:
                    prefix += " " + thousands[thousand_counter]
                if result:
                    result = prefix + " " + result
                else:
                    result = prefix
            n //= 1000
            thousand_counter += 1
        
        return result
    
    if amount == 0:
        return "Zero South Sudanese Pounds Only"
    
    whole = int(amount)
    decimal = int(round((amount - whole) * 100))
    
    result = convert_integer(whole) + " South Sudanese Pound"
    if whole != 1:
        result += "s"
    
    if decimal > 0:
        result += " and " + convert_integer(decimal) + " Piaster"
        if decimal != 1:
            result += "s"
    
    return result + " Only"


def _generate_receipt_number(transaction_id: str = None, db=None) -> str:
    """Generate a sequential receipt number."""
    year = datetime.utcnow().strftime("%y")
    
    if db is not None:
        # Find last receipt number for this year
        last_payment = db.payments.find_one(
            {"receipt_number": {"$regex": f"^RCP-{year}"}},
            sort=[("created_at", -1)]
        )
        
        if last_payment and last_payment.get("receipt_number"):
            try:
                last_num = int(last_payment["receipt_number"].split("-")[-1])
                return f"RCP-{year}{last_num + 1:04d}"
            except (ValueError, IndexError):
                pass
    
    # Fallback: use timestamp-based number
    return f"RCP-{year}{datetime.utcnow().strftime('%m%d%H%M%S')}"


# =========================================================================
# SUMMARY & DASHBOARD (specific routes BEFORE /{id})
# =========================================================================

@router.get("/summary")
async def get_summary(
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get financial summary"""
    db = get_database()
    year = academic_year or _get_current_academic_year()
    
    income = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "income", "approval_status": "approved", "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    expenses = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "expense", "approval_status": "approved", "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    total_income = income[0]["total"] if income else 0
    total_expenses = expenses[0]["total"] if expenses else 0
    
    return {
        "success": True, "message": "Summary retrieved",
        "data": {
            "academic_year": year,
            "income": {"total": round(total_income, 2)},
            "expense": {"total": round(total_expenses, 2)},
            "balance": round(total_income - total_expenses, 2)
        }
    }


@router.get("/dashboard")
async def financial_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Financial dashboard"""
    db = get_database()
    year = _get_current_academic_year()
    
    income = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "income", "approval_status": "approved", "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    expenses = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "expense", "approval_status": "approved", "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    total_income = income[0]["total"] if income else 0
    total_expenses = expenses[0]["total"] if expenses else 0
    pending = await db.financial_records.count_documents({"approval_status": "pending"})
    recent = await db.financial_records.find().sort("created_at", -1).limit(5).to_list(length=5)
    recent = [parse_mongo_document(t) for t in recent]
    
    total_payments = await db.payments.count_documents({"academic_year": year})
    payment_total = await db.payments.aggregate([
        {"$match": {"academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}}
    ]).to_list(length=1)
    
    return {
        "success": True, "message": "Dashboard retrieved",
        "data": {
            "academic_year": year, "current_term": _get_current_term(),
            "current_balance": round(total_income - total_expenses, 2),
            "total_income": round(total_income, 2),
            "total_expenses": round(total_expenses, 2),
            "pending_approvals": pending,
            "total_payments": total_payments,
            "total_payments_amount": round(payment_total[0]["total"], 2) if payment_total else 0,
            "recent_transactions": recent
        }
    }


# =========================================================================
# PAYMENTS
# =========================================================================

@router.get("/payments")
async def list_payments(
    student_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List payments with filters"""
    db = get_database()
    filter_query = {}
    
    if student_id:
        sid = _safe_objectid(student_id)
        if sid: filter_query["student_id"] = sid
    if search:
        filter_query["$or"] = [
            {"student_name": {"$regex": search, "$options": "i"}},
            {"receipt_number": {"$regex": search, "$options": "i"}},
        ]
    if academic_year: filter_query["academic_year"] = academic_year
    if status: filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.payments.count_documents(filter_query)
    payments = await db.payments.find(filter_query).sort("payment_date", -1).skip(skip).limit(limit).to_list(length=limit)
    payments = [parse_mongo_document(p) for p in payments]
    
    return {
        "success": True, "message": "Payments retrieved",
        "data": {"payments": payments, "total": total, "page": page, "limit": limit}
    }


@router.post("/payments")
async def record_payment(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Record a payment with student details"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    student_id = body.get('student_id', '')
    amount_paid = body.get('amount_paid', body.get('amount', 0))
    
    if not student_id or not amount_paid:
        raise HTTPException(status_code=400, detail="Student ID and amount are required")
    
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    
    student = await db.students.find_one({"_id": sid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
    
    class_name = ""
    if student.get("current_class_id"):
        cls = await db.classes.find_one({"_id": student["current_class_id"]})
        if cls: class_name = cls.get("class_name", "")
    
    # Generate receipt number if not provided
    receipt_number = body.get('receipt_number') or _generate_receipt_number(db=db)
    academic_year = body.get('academic_year') or _get_current_academic_year()
    payment_status = body.get('status', 'completed')
    
    doc = {
        "student_id": sid,
        "student_name": student_name,
        "class_name": class_name,
        "amount_paid": float(amount_paid),
        "payment_method": body.get('payment_method', 'cash'),
        "payment_type": body.get('payment_type', 'school_fees'),
        "fee_type": body.get('fee_type', 'tuition'),
        "paid_by": body.get('paid_by', student_name),
        "payment_date": datetime.utcnow(),
        "receipt_number": receipt_number,
        "status": payment_status,
        "recorded_by": current_user.get("_id"),
        "recorded_by_name": current_user.get("first_name", "") + " " + current_user.get("last_name", ""),
        "academic_year": academic_year,
        "term": body.get('term') or _get_current_term(),
        "notes": body.get('notes'),
        "transaction_reference": body.get('transaction_reference'),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.payments.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc = parse_mongo_document(doc)
    
    return {"success": True, "message": "Payment recorded", "data": doc}


@router.get("/payments/{payment_id}")
async def get_payment(
    payment_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get single payment"""
    db = get_database()
    obj_id = _safe_objectid(payment_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid payment ID")
    
    payment = await db.payments.find_one({"_id": obj_id})
    if not payment: raise HTTPException(status_code=404, detail="Payment not found")
    
    payment = parse_mongo_document(payment)
    return {"success": True, "message": "Payment retrieved", "data": payment}


@router.put("/payments/{payment_id}")
async def update_payment(
    payment_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Update a payment (status, notes, etc.)"""
    db = get_database()
    obj_id = _safe_objectid(payment_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid payment ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body: raise HTTPException(status_code=400, detail="No fields to update")
    
    allowed_fields = ["status", "notes", "payment_method", "transaction_reference", "academic_year", "term"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.payments.find_one_and_update(
        {"_id": obj_id}, {"$set": update_data}, return_document=True
    )
    
    if not result: raise HTTPException(status_code=404, detail="Payment not found")
    result = parse_mongo_document(result)
    return {"success": True, "message": "Payment updated", "data": result}


@router.delete("/payments/{payment_id}")
async def delete_payment(
    payment_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete a payment"""
    db = get_database()
    obj_id = _safe_objectid(payment_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid payment ID")
    
    payment = await db.payments.find_one({"_id": obj_id})
    if not payment: raise HTTPException(status_code=404, detail="Payment not found")
    
    await db.payments.delete_one({"_id": obj_id})
    return {"success": True, "message": "Payment deleted"}


# =========================================================================
# RECEIPT ENDPOINTS
# =========================================================================

@router.get("/next-receipt-number")
async def get_next_receipt_number(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get the next receipt number for preview"""
    db = get_database()
    receipt_number = _generate_receipt_number(db=db)
    
    return {
        "success": True,
        "message": "Next receipt number generated",
        "data": {"receipt_number": receipt_number}
    }


@router.get("/receipt/{payment_id}")
async def get_payment_receipt(
    payment_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get receipt data for a payment"""
    db = get_database()
    
    obj_id = _safe_objectid(payment_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid payment ID")
    
    # Get payment with student info
    payment = await db.payments.find_one({"_id": obj_id})
    
    if not payment:
        # Try financial_records collection
        payment = await db.financial_records.find_one({"_id": obj_id})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get student details if student_id exists
    student_name = payment.get("student_name", "")
    class_name = payment.get("class_name", "")
    
    if payment.get("student_id") and not student_name:
        student = await db.students.find_one({"_id": payment["student_id"]})
        if student:
            student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
            
            if student.get("current_class_id") and not class_name:
                cls = await db.classes.find_one({"_id": student["current_class_id"]})
                if cls:
                    class_name = cls.get("class_name", "")
    
    # Get school info
    school = await db.school_info.find_one({}) or {}
    
    # Determine amount field
    amount = payment.get("amount_paid") or payment.get("amount", 0)
    
    receipt_data = {
        "receipt_number": payment.get("receipt_number", ""),
        "payment_id": str(payment["_id"]),
        "date": payment.get("payment_date") or payment.get("transaction_date") or payment.get("created_at"),
        "student_name": student_name,
        "student_id": str(payment.get("student_id", "")),
        "class_name": class_name,
        "amount": float(amount),
        "amount_words": _number_to_words(float(amount)),
        "payment_method": payment.get("payment_method", "Cash"),
        "payment_for": payment.get("payment_type") or payment.get("fee_type") or payment.get("description", "School Fees"),
        "term": payment.get("term", ""),
        "academic_year": payment.get("academic_year", ""),
        "received_by": payment.get("recorded_by_name", ""),
        "school": {
            "name": school.get("school_name", "Heavenly Nature Nursery & Primary School"),
            "address": school.get("address", ""),
            "phone": school.get("phone", ""),
            "email": school.get("email", ""),
            "motto": school.get("motto", "Nurturing Right Leaders"),
            "logo_url": school.get("logo_url", "/logo.png")
        }
    }
    
    return {
        "success": True,
        "message": "Receipt data retrieved",
        "data": receipt_data
    }


# =========================================================================
# FEE STRUCTURE
# =========================================================================

@router.get("/fees")
async def get_fee_structure(
    academic_year: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get fee structure"""
    db = get_database()
    filter_query = {}
    if academic_year: filter_query["academic_year"] = academic_year
    
    fees = await db.fee_structure.find(filter_query).to_list(length=None)
    fees = [parse_mongo_document(f) for f in fees]
    
    return {
        "success": True, "message": "Fee structure retrieved",
        "data": {"fees": fees, "total": len(fees), "academic_year": academic_year or _get_current_academic_year()}
    }


@router.post("/fees")
async def create_fee(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Create fee structure entry"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    fee_name = body.get('fee_name', '')
    amount = body.get('amount', 0)
    if not fee_name or not amount:
        raise HTTPException(status_code=400, detail="Fee name and amount are required")
    
    doc = {
        "fee_name": fee_name, "fee_type": body.get('fee_type', 'tuition'),
        "amount": float(amount), "class_level": body.get('class_level'),
        "academic_year": body.get('academic_year') or _get_current_academic_year(),
        "term": body.get('term') or _get_current_term(),
        "description": body.get('description', ''),
        "is_mandatory": body.get('is_mandatory', True),
        "status": "active", "created_by": current_user.get("_id"),
        "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
    }
    
    result = await db.fee_structure.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc = parse_mongo_document(doc)
    return {"success": True, "message": "Fee created", "data": doc}


# =========================================================================
# TRANSACTIONS - LIST & CREATE
# =========================================================================

@router.get("")
@router.get("/")
async def list_transactions(
    type: Optional[str] = Query(None, alias="type"),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List financial transactions"""
    db = get_database()
    filter_query = {}
    if type: filter_query["transaction_type"] = type
    if category: filter_query["category"] = category
    if status: filter_query["approval_status"] = status
    if academic_year: filter_query["academic_year"] = academic_year
    if search:
        filter_query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"reference_number": {"$regex": search, "$options": "i"}},
        ]
    
    skip = (page - 1) * limit
    total = await db.financial_records.count_documents(filter_query)
    transactions = await db.financial_records.find(filter_query).sort("transaction_date", -1).skip(skip).limit(limit).to_list(length=limit)
    transactions = [parse_mongo_document(t) for t in transactions]
    
    return {
        "success": True, "message": "Transactions retrieved",
        "data": {"transactions": transactions, "total": total, "page": page, "limit": limit}
    }


@router.post("")
@router.post("/")
async def create_transaction(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Record a transaction"""
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
    
    academic_year = body.get('academic_year') or _get_current_academic_year()
    term = body.get('term') or _get_current_term()
    approval_status = body.get('status', body.get('approval_status', 'completed'))
    
    doc = {
        "transaction_date": date_obj, "amount": float(amount),
        "transaction_type": transaction_type, "category": category,
        "description": description,
        "payment_method": body.get('payment_method', 'cash'),
        "reference_number": body.get('reference_number') or f"TXN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "recorded_by": current_user.get("_id"),
        "recorded_by_name": current_user.get("first_name", "") + " " + current_user.get("last_name", ""),
        "approval_status": approval_status,
        "academic_year": academic_year, "term": term,
        "notes": body.get('notes'),
        "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
    }
    
    result = await db.financial_records.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc = parse_mongo_document(doc)
    return {"success": True, "message": "Transaction recorded", "data": doc}


# =========================================================================
# TRANSACTIONS - BY ID (LAST)
# =========================================================================

@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get single transaction"""
    db = get_database()
    obj_id = _safe_objectid(transaction_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid transaction ID")
    
    transaction = await db.financial_records.find_one({"_id": obj_id})
    if not transaction: raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction = parse_mongo_document(transaction)
    return {"success": True, "message": "Transaction retrieved", "data": transaction}


@router.put("/{transaction_id}")
async def update_transaction(
    transaction_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))
):
    """Update a transaction"""
    db = get_database()
    obj_id = _safe_objectid(transaction_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid transaction ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body: raise HTTPException(status_code=400, detail="No fields to update")
    
    if 'status' in body and 'approval_status' not in body:
        body['approval_status'] = body.pop('status')
    
    body["updated_at"] = datetime.utcnow()
    
    result = await db.financial_records.find_one_and_update(
        {"_id": obj_id}, {"$set": body}, return_document=True
    )
    
    if not result: raise HTTPException(status_code=404, detail="Transaction not found")
    result = parse_mongo_document(result)
    return {"success": True, "message": "Transaction updated", "data": result}


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete a transaction"""
    db = get_database()
    obj_id = _safe_objectid(transaction_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid transaction ID")
    
    transaction = await db.financial_records.find_one({"_id": obj_id})
    if not transaction: raise HTTPException(status_code=404, detail="Transaction not found")
    
    await db.financial_records.delete_one({"_id": obj_id})
    return {"success": True, "message": "Transaction deleted"}
