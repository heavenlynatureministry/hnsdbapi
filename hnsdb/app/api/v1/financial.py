"""Financial API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request, Path
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


def _get_current_term() -> str:
    """Calculate current term dynamically."""
    month = datetime.utcnow().month
    if 2 <= month <= 4:
        return "Term 1"
    elif 5 <= month <= 7:
        return "Term 2"
    elif 9 <= month <= 11:
        return "Term 3"
    elif month == 8:
        return "Term 2 Break"
    else:
        return "Annual Break"


def _number_to_words(amount: float) -> str:
    """Convert number to words for receipt."""
    amount = round(float(amount), 2)
    
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
    teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
             "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    thousands = ["", "Thousand", "Million", "Billion"]

    def convert_less_than_thousand(n):
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

    def convert_integer(n):
        if n == 0:
            return "Zero"
        result = ""
        thousand_counter = 0
        while n > 0:
            if n % 1000 != 0:
                prefix = convert_less_than_thousand(n % 1000)
                if thousand_counter > 0:
                    prefix += " " + thousands[thousand_counter]
                result = prefix + " " + result if result else prefix
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


async def _generate_receipt_number(db) -> str:
    """Generate a UNIFIED sequential number for ALL financial records."""
    if db is not None:
        try:
            latest_num = 0

            last_payment = await db.payments.find_one(
                {"receipt_number": {"$regex": "^HNSRCT-[0-9]{9}$"}},
                sort=[("created_at", -1)]
            )
            if last_payment and last_payment.get("receipt_number"):
                try:
                    num_str = last_payment["receipt_number"].replace("HNSRCT-", "")
                    if num_str.isdigit() and len(num_str) == 9:
                        num = int(num_str)
                        if num > latest_num:
                            latest_num = num
                except (ValueError, AttributeError):
                    pass

            last_record = await db.financial_records.find_one(
                {"reference_number": {"$regex": "^HNSRCT-[0-9]{9}$"}},
                sort=[("created_at", -1)]
            )
            if last_record and last_record.get("reference_number"):
                try:
                    num_str = last_record["reference_number"].replace("HNSRCT-", "")
                    if num_str.isdigit() and len(num_str) == 9:
                        num = int(num_str)
                        if num > latest_num:
                            latest_num = num
                except (ValueError, AttributeError):
                    pass

            if latest_num > 0:
                next_num = latest_num + 1
                print(f"✅ Generated: HNSRCT-{next_num:09d} (latest: {latest_num})")
                return f"HNSRCT-{next_num:09d}"

        except Exception as e:
            print(f"⚠️ Receipt number error: {e}")

    return "HNSRCT-000000001"


async def _calculate_balance(db, student_oid, fee_type: str, academic_year: str) -> dict:
    """Calculate student fee balance for a specific fee type."""
    fee_structure = await db.fee_structure.find_one({
        "fee_type": fee_type, "academic_year": academic_year, "status": "active"
    })
    total_fee = round(float(fee_structure.get("amount", 0)), 2) if fee_structure else 0

    all_payments = await db.payments.find({
        "student_id": student_oid, "fee_type": fee_type,
        "academic_year": academic_year, "status": "completed"
    }).to_list(length=None)

    total_paid = round(sum(p.get("amount_paid", 0) for p in all_payments), 2)
    balance = round(max(0, total_fee - total_paid), 2)

    return {
        "fee_type": fee_type,
        "fee_name": fee_structure.get("fee_name", fee_type.replace("_", " ").title()) if fee_structure else fee_type,
        "total_fee": total_fee,
        "total_paid": total_paid,
        "balance": balance,
        "balance_display": "NIL" if balance <= 0 else f"SSP {balance:,.2f}",
        "is_cleared": balance <= 0
    }


# =========================================================================
# SUMMARY & DASHBOARD
# =========================================================================

@router.get("/summary")
async def get_summary(academic_year: Optional[str] = Query(None), current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    year = academic_year or _get_current_academic_year()

    income_result = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "income", "approval_status": "approved", "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)

    expenses_result = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "expense", "approval_status": "approved", "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)

    total_income = income_result[0]["total"] if income_result else 0
    total_expenses = expenses_result[0]["total"] if expenses_result else 0

    return {
        "success": True,
        "message": "Summary retrieved",
        "data": {
            "academic_year": year,
            "income": {"total": round(total_income, 2)},
            "expense": {"total": round(total_expenses, 2)},
            "balance": round(total_income - total_expenses, 2)
        }
    }


@router.get("/dashboard")
async def financial_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    year = _get_current_academic_year()

    tx_income_result = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "income", "approval_status": "completed", "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)

    tx_expenses_result = await db.financial_records.aggregate([
        {"$match": {"transaction_type": "expense", "approval_status": "completed", "academic_year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)

    payment_result = await db.payments.aggregate([
        {"$match": {"academic_year": year, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}, "count": {"$sum": 1}}}
    ]).to_list(length=1)

    tx_income_total = tx_income_result[0]["total"] if tx_income_result else 0
    tx_expense_total = tx_expenses_result[0]["total"] if tx_expenses_result else 0
    payment_amt = payment_result[0]["total"] if payment_result else 0
    payment_count = payment_result[0]["count"] if payment_result else 0

    total_income = tx_income_total + payment_amt
    total_expenses = tx_expense_total
    net_balance = total_income - total_expenses

    pending = await db.financial_records.count_documents({"approval_status": "pending"})
    recent = await db.financial_records.find().sort("created_at", -1).limit(5).to_list(length=5)
    recent = [parse_mongo_document(t) for t in recent]

    return {
        "success": True,
        "message": "Dashboard retrieved",
        "data": {
            "academic_year": year,
            "current_term": _get_current_term(),
            "total_income": round(total_income, 2),
            "total_expenses": round(total_expenses, 2),
            "net_balance": round(net_balance, 2),
            "student_payments": round(payment_amt, 2),
            "student_payments_count": payment_count,
            "donations_income": round(tx_income_total, 2),
            "pending_approvals": pending,
            "recent_transactions": recent
        }
    }


# =========================================================================
# STUDENT FEE BALANCE
# =========================================================================

@router.get("/student-balance/{student_id}")
async def get_student_balance(student_id: str, academic_year: Optional[str] = Query(None),
                               fee_type: Optional[str] = Query(None), current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID")
    student = await db.students.find_one({"_id": sid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    year = academic_year or _get_current_academic_year()
    fee_filter = {"academic_year": year, "status": "active"}
    if fee_type:
        fee_filter["fee_type"] = fee_type
    fee_structures = await db.fee_structure.find(fee_filter).to_list(length=None)
    payments = await db.payments.find({"student_id": sid, "academic_year": year, "status": "completed"}).to_list(length=None)
    balances = []
    for fee in fee_structures:
        ft = fee.get("fee_type", "other")
        tp = round(sum(p.get("amount_paid", 0) for p in payments if p.get("fee_type") == ft), 2)
        bal = round(max(0, fee.get("amount", 0) - tp), 2)
        balances.append({
            "fee_name": fee.get("fee_name", ft), "fee_type": ft, "total_fee": round(fee.get("amount", 0), 2),
            "total_paid": tp, "balance": bal,
            "balance_display": "NIL" if bal <= 0 else f"SSP {bal:,.2f}",
            "is_cleared": bal <= 0, "academic_year": year
        })
    total_outstanding = round(sum(b["balance"] for b in balances), 2)
    return {
        "success": True, "message": "Student balance retrieved",
        "data": {
            "student_id": student_id,
            "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
            "academic_year": year, "balances": balances, "total_outstanding": total_outstanding,
            "total_outstanding_display": "NIL" if total_outstanding <= 0 else f"SSP {total_outstanding:,.2f}"
        }
    }


# =========================================================================
# PAYMENTS
# =========================================================================

@router.get("/payments")
async def list_payments(student_id: Optional[str] = Query(None), search: Optional[str] = Query(None),
                         academic_year: Optional[str] = Query(None), status: Optional[str] = Query(None),
                         page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                         current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    filter_query = {}
    if student_id:
        sid = _safe_objectid(student_id)
        if sid:
            filter_query["student_id"] = sid
    if search:
        filter_query["$or"] = [
            {"student_name": {"$regex": search, "$options": "i"}},
            {"receipt_number": {"$regex": search, "$options": "i"}}
        ]
    if academic_year:
        filter_query["academic_year"] = academic_year
    if status:
        filter_query["status"] = status
    skip = (page - 1) * limit
    total = await db.payments.count_documents(filter_query)
    payments = await db.payments.find(filter_query).sort("payment_date", -1).skip(skip).limit(limit).to_list(length=limit)
    return {
        "success": True, "message": "Payments retrieved",
        "data": {"payments": [parse_mongo_document(p) for p in payments], "total": total, "page": page, "limit": limit}
    }


@router.post("/payments")
async def record_payment(request: Request, current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))):
    """Record a student payment with precise amount handling."""
    db = get_database()
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    student_id = body.get('student_id', '')
    amount_paid = body.get('amount_paid', body.get('amount', 0))

    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID is required")
    if not amount_paid or float(amount_paid) <= 0:
        raise HTTPException(status_code=400, detail="Valid amount is required")

    # ✅ Round to 2 decimal places to avoid floating point issues
    amount_paid = round(float(amount_paid), 2)

    sid = _safe_objectid(student_id)
    if not sid:
        raise HTTPException(status_code=400, detail="Invalid student ID format")

    student = await db.students.find_one({"_id": sid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()

    class_name = ""
    try:
        if student.get("current_class_id"):
            cls = await db.classes.find_one({"_id": student["current_class_id"]})
            if cls:
                class_name = cls.get("class_name", "")
    except Exception:
        pass

    receipt_number = body.get('receipt_number') or await _generate_receipt_number(db)
    academic_year = body.get('academic_year') or _get_current_academic_year()
    fee_type = body.get('fee_type', 'tuition')
    payment_status = body.get('status', 'completed')
    term = body.get('term') or _get_current_term()

    recorded_by_name = "System"
    try:
        first = current_user.get("first_name", "")
        last = current_user.get("last_name", "")
        if first or last:
            recorded_by_name = f"{first} {last}".strip()
    except Exception:
        pass

    doc = {
        "student_id": sid,
        "student_name": student_name,
        "class_name": class_name,
        "amount_paid": amount_paid,
        "payment_method": body.get('payment_method', 'cash'),
        "payment_type": body.get('payment_type', 'school_fees'),
        "fee_type": fee_type,
        "paid_by": body.get('paid_by', student_name),
        "payment_date": datetime.utcnow(),
        "receipt_number": receipt_number,
        "status": payment_status,
        "recorded_by": current_user.get("_id"),
        "recorded_by_name": recorded_by_name,
        "academic_year": academic_year,
        "term": term,
        "notes": body.get('notes', ''),
        "transaction_reference": body.get('transaction_reference', ''),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    doc = {k: v for k, v in doc.items() if v is not None}

    try:
        result = await db.payments.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        doc = parse_mongo_document(doc)

        balance_info = await _calculate_balance(db, sid, fee_type, academic_year)
        doc["balance_info"] = balance_info

        print(f"✅ Payment: {receipt_number} | Amount: SSP {amount_paid:,.2f} | Balance: {balance_info['balance_display']}")
        return {"success": True, "message": "Payment recorded successfully", "data": doc}
    except Exception as e:
        print(f"❌ Payment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to record payment: {str(e)}")


@router.get("/payments/{payment_id}")
async def get_payment(payment_id: str = Path(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    obj_id = _safe_objectid(payment_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid payment ID")
    payment = await db.payments.find_one({"_id": obj_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"success": True, "message": "Payment retrieved", "data": parse_mongo_document(payment)}


@router.put("/payments/{payment_id}")
async def update_payment(payment_id: str = Path(...), request: Request = None,
                          current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))):
    db = get_database()
    obj_id = _safe_objectid(payment_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid payment ID")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    allowed_fields = ["status", "notes", "payment_method", "transaction_reference", "academic_year", "term"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_data["updated_at"] = datetime.utcnow()
    result = await db.payments.find_one_and_update({"_id": obj_id}, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"success": True, "message": "Payment updated", "data": parse_mongo_document(result)}


@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str = Path(...), current_user: Dict[str, Any] = Depends(require_role("admin"))):
    db = get_database()
    obj_id = _safe_objectid(payment_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid payment ID")
    payment = await db.payments.find_one({"_id": obj_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    await db.payments.delete_one({"_id": obj_id})
    return {"success": True, "message": "Payment deleted"}


# =========================================================================
# RECEIPT ENDPOINTS
# =========================================================================

@router.get("/next-receipt-number")
async def get_next_receipt_number(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    return {
        "success": True, "message": "Next receipt number generated",
        "data": {"receipt_number": await _generate_receipt_number(db)}
    }


@router.get("/receipt/{record_id}")
async def get_receipt(record_id: str = Path(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get receipt data for payment or transaction"""
    db = get_database()
    obj_id = _safe_objectid(record_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid ID")

    record = await db.payments.find_one({"_id": obj_id})
    is_payment = True

    if not record:
        record = await db.financial_records.find_one({"_id": obj_id})
        is_payment = False
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")

    student_name = record.get("student_name", "")
    class_name = record.get("class_name", "")
    paid_by = record.get("paid_by", "") or record.get("recorded_by_name", "")

    if record.get("student_id") and not student_name:
        try:
            student = await db.students.find_one({"_id": record["student_id"]})
            if student:
                student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
                if student.get("current_class_id") and not class_name:
                    cls = await db.classes.find_one({"_id": student["current_class_id"]})
                    if cls:
                        class_name = cls.get("class_name", "")
        except Exception:
            pass

    school = await db.school_info.find_one({}) or {}
    amount = round(float(record.get("amount_paid") or record.get("amount", 0)), 2)
    fee_type = record.get("fee_type", "tuition")
    year = record.get("academic_year", "")

    payment_for = record.get("payment_type") or record.get("fee_type") or record.get("description", "School Fees")

    balance_info = None
    if is_payment and record.get("student_id"):
        try:
            balance_info = await _calculate_balance(db, record["student_id"], fee_type, year)
        except Exception:
            pass

    receipt_data = {
        "receipt_number": record.get("receipt_number") or record.get("reference_number", ""),
        "record_id": str(record["_id"]),
        "date": record.get("payment_date") or record.get("transaction_date") or record.get("created_at"),
        "student_name": student_name or "N/A",
        "student_id": str(record.get("student_id", "")),
        "class_name": class_name or "N/A",
        "amount": amount,
        "amount_words": _number_to_words(amount),
        "payment_method": record.get("payment_method", "Cash"),
        "payment_for": payment_for,
        "term": record.get("term", ""),
        "academic_year": year,
        "received_by": record.get("recorded_by_name", ""),
        "paid_by": paid_by or "N/A",
        "balance_info": balance_info,
        "organization_name": record.get("organization_name", ""),
        "representative_name": record.get("representative_name", ""),
        "school": {
            "name": school.get("school_name", "Heavenly Nature Nursery & Primary School"),
            "address": school.get("address", ""), "phone": school.get("phone", ""),
            "email": school.get("email", ""), "motto": school.get("motto", "Nurturing Right Leaders"),
            "logo_url": school.get("logo_url", "/logo.png")
        }
    }
    return {"success": True, "message": "Receipt data retrieved", "data": receipt_data}


# =========================================================================
# FEE STRUCTURE
# =========================================================================

@router.get("/fees")
async def get_fee_structure(academic_year: Optional[str] = Query(None), current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    filter_query = {}
    if academic_year:
        filter_query["academic_year"] = academic_year
    fees = await db.fee_structure.find(filter_query).to_list(length=None)
    return {
        "success": True, "message": "Fee structure retrieved",
        "data": {
            "fees": [parse_mongo_document(f) for f in fees],
            "total": len(fees),
            "academic_year": academic_year or _get_current_academic_year()
        }
    }


@router.post("/fees")
async def create_fee(request: Request, current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))):
    db = get_database()
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    fee_name = body.get('fee_name', '').strip()
    amount = body.get('amount', 0)
    if not fee_name or not amount:
        raise HTTPException(status_code=400, detail="Fee name and amount are required")
    doc = {
        "fee_name": fee_name, "fee_type": body.get('fee_type', 'tuition'),
        "amount": round(float(amount), 2), "class_level": body.get('class_level'),
        "academic_year": body.get('academic_year') or _get_current_academic_year(),
        "term": body.get('term') or _get_current_term(), "description": body.get('description', ''),
        "is_mandatory": body.get('is_mandatory', True), "status": "active",
        "created_by": current_user.get("_id"), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
    }
    result = await db.fee_structure.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {"success": True, "message": "Fee created", "data": parse_mongo_document(doc)}


@router.put("/fees/{fee_id}")
async def update_fee(fee_id: str = Path(...), request: Request = None,
                      current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))):
    db = get_database()
    obj_id = _safe_objectid(fee_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid fee ID")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    allowed_fields = ["fee_name", "amount", "fee_type", "class_level", "description", "is_mandatory", "status", "term"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_data["updated_at"] = datetime.utcnow()
    result = await db.fee_structure.find_one_and_update({"_id": obj_id}, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Fee not found")
    return {"success": True, "message": "Fee updated", "data": parse_mongo_document(result)}


@router.delete("/fees/{fee_id}")
async def delete_fee(fee_id: str = Path(...), current_user: Dict[str, Any] = Depends(require_role("admin"))):
    db = get_database()
    obj_id = _safe_objectid(fee_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid fee ID")
    result = await db.fee_structure.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fee not found")
    return {"success": True, "message": "Fee deleted"}


# =========================================================================
# RESET FINANCIAL DATA
# =========================================================================

@router.post("/reset")
async def reset_financial_data(request: Request, current_user: Dict[str, Any] = Depends(require_role("admin"))):
    """⚠️ Reset all financial data"""
    db = get_database()
    try:
        body = await request.json()
    except Exception:
        body = {}
    confirmation = body.get("confirmation", "").strip().upper()
    if confirmation != "DELETE ALL FINANCIAL DATA":
        raise HTTPException(status_code=400, detail="You must type 'DELETE ALL FINANCIAL DATA' to confirm reset")

    results = {}
    try:
        if body.get("reset_transactions", True):
            c = await db.financial_records.count_documents({})
            await db.financial_records.delete_many({})
            results["transactions_deleted"] = c
        if body.get("reset_payments", True):
            c = await db.payments.count_documents({})
            await db.payments.delete_many({})
            results["payments_deleted"] = c
        if body.get("reset_fees", True):
            c = await db.fee_structure.count_documents({})
            await db.fee_structure.delete_many({})
            results["fees_deleted"] = c
        if body.get("reset_budgets", True):
            c = await db.budgets.count_documents({})
            await db.budgets.delete_many({})
            results["budgets_deleted"] = c
        try:
            changed_by = None
            uid = current_user.get("_id")
            if uid:
                cv = _safe_objectid(uid)
                if cv:
                    changed_by = cv
            await db.audit_log.insert_one({
                "table_name": "financial_reset",
                "record_id": f"RESET-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                "operation": "RESET_ALL", "changed_by": changed_by,
                "details": results, "changed_at": datetime.utcnow()
            })
        except Exception as e:
            print(f"⚠️ Audit log: {e}")
        total = sum(results.values())
        print(f"🔄 Financial reset: {results} | Total: {total}")
        return {
            "success": True, "message": "Financial data reset complete",
            "data": {"results": results, "total_deleted": total}
        }
    except Exception as e:
        print(f"❌ Reset error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reset: {str(e)}")


# =========================================================================
# TRANSACTIONS
# =========================================================================

@router.get("")
@router.get("/")
async def list_transactions(type: Optional[str] = Query(None, alias="type"), category: Optional[str] = Query(None),
                             status: Optional[str] = Query(None), search: Optional[str] = Query(None),
                             academic_year: Optional[str] = Query(None), page: int = Query(1, ge=1),
                             limit: int = Query(20, ge=1, le=100), current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    filter_query = {}
    if type:
        filter_query["transaction_type"] = type
    if category:
        filter_query["category"] = category
    if status:
        filter_query["approval_status"] = status
    if academic_year:
        filter_query["academic_year"] = academic_year
    if search:
        filter_query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"reference_number": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    total = await db.financial_records.count_documents(filter_query)
    transactions = await db.financial_records.find(filter_query).sort("transaction_date", -1).skip(skip).limit(limit).to_list(length=limit)
    return {
        "success": True, "message": "Transactions retrieved",
        "data": {
            "transactions": [parse_mongo_document(t) for t in transactions],
            "total": total, "page": page, "limit": limit
        }
    }


@router.post("")
@router.post("/")
async def create_transaction(request: Request, current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))):
    """Record a transaction (income/expense) - for organizations, donations, church, etc."""
    db = get_database()
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    td = body.get('transaction_date', '')
    amt = body.get('amount', 0)
    tt = body.get('transaction_type', '')
    cat = body.get('category', '')
    desc = body.get('description', '')

    if not td or not amt or not tt or not desc:
        raise HTTPException(status_code=400, detail="Date, amount, type, and description are required")

    try:
        date_obj = datetime.strptime(td, '%Y-%m-%d')
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    academic_year = body.get('academic_year') or _get_current_academic_year()
    term = body.get('term') or _get_current_term()
    approval_status = body.get('status', body.get('approval_status', 'completed'))
    reference_number = body.get('reference_number') or await _generate_receipt_number(db)

    organization_name = body.get('organization_name', '').strip()
    representative_name = body.get('representative_name', '').strip()
    representative_phone = body.get('representative_phone', '').strip()
    doc = {
        "transaction_date": date_obj, "amount": float(amt), "transaction_type": tt, "category": cat,
        "description": desc, "payment_method": body.get('payment_method', 'cash'),
        "reference_number": reference_number, "recorded_by": current_user.get("_id"),
        "recorded_by_name": current_user.get("first_name", "") + " " + current_user.get("last_name", ""),
        "approval_status": approval_status, "academic_year": academic_year, "term": term,
        "notes": body.get('notes', ''), "organization_name": organization_name,
        "representative_name": representative_name, "representative_phone": representative_phone,
        "paid_by": representative_name or organization_name or body.get('paid_by', ''),
        "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
    }
    doc = {k: v for k, v in doc.items() if v is not None and v != ''}
    result = await db.financial_records.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    print(f"✅ Transaction: {reference_number} | {organization_name or 'N/A'}")
    return {"success": True, "message": "Transaction recorded", "data": parse_mongo_document(doc)}


@router.get("/{transaction_id}")
async def get_transaction(transaction_id: str = Path(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    obj_id = _safe_objectid(transaction_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid transaction ID")
    txn = await db.financial_records.find_one({"_id": obj_id})
    if not txn: raise HTTPException(status_code=404, detail="Transaction not found")
    return {"success": True, "message": "Transaction retrieved", "data": parse_mongo_document(txn)}


@router.put("/{transaction_id}")
async def update_transaction(transaction_id: str = Path(...), request: Request = None,
                              current_user: Dict[str, Any] = Depends(require_role("admin", "accountant"))):
    db = get_database()
    obj_id = _safe_objectid(transaction_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid transaction ID")
    try: body = await request.json()
    except Exception: raise HTTPException(status_code=400, detail="Invalid JSON body")
    if not body: raise HTTPException(status_code=400, detail="No fields to update")
    if 'status' in body and 'approval_status' not in body: body['approval_status'] = body.pop('status')
    body["updated_at"] = datetime.utcnow()
    result = await db.financial_records.find_one_and_update({"_id": obj_id}, {"$set": body}, return_document=True)
    if not result: raise HTTPException(status_code=404, detail="Transaction not found")
    return {"success": True, "message": "Transaction updated", "data": parse_mongo_document(result)}


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: str = Path(...), current_user: Dict[str, Any] = Depends(require_role("admin"))):
    db = get_database()
    obj_id = _safe_objectid(transaction_id)
    if not obj_id: raise HTTPException(status_code=400, detail="Invalid transaction ID")
    txn = await db.financial_records.find_one({"_id": obj_id})
    if not txn: raise HTTPException(status_code=404, detail="Transaction not found")
    await db.financial_records.delete_one({"_id": obj_id})
    return {"success": True, "message": "Transaction deleted"}
