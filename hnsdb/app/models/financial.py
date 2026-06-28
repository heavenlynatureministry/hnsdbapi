"""
Financial Model - Complete financial management system
Handles: Income, Expenses, Budgets, Fee Management, Payment Tracking, Financial Reports
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple, Union
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class FinancialModel:
    """
    Financial model for MongoDB
    Collections: financial_records, fee_structures, payments, budgets
    """
    
    FINANCIAL_RECORDS = "financial_records"
    FEE_STRUCTURES = "fee_structures"
    PAYMENTS = "payments"
    BUDGETS = "budgets"
    
    TRANSACTION_TYPES = ["income", "expense"]
    
    INCOME_CATEGORIES = ["tuition_fees", "registration_fees", "examination_fees", "transportation_fees", "uniform_fees", "donations", "grants", "fundraising", "other_income"]
    
    EXPENSE_CATEGORIES = ["salaries", "utilities", "rent", "maintenance", "supplies", "equipment", "textbooks", "transportation", "food_program", "medical", "training", "insurance", "administrative", "other_expenses"]
    
    APPROVAL_STATUSES = ["pending", "approved", "rejected", "cancelled"]
    PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "cheque", "scholarship"]
    PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded", "partial"]
    
    CATEGORY_DISPLAY = {
        "tuition_fees": "Tuition Fees", "registration_fees": "Registration Fees",
        "examination_fees": "Examination Fees", "transportation_fees": "Transportation Fees",
        "uniform_fees": "Uniform Fees", "donations": "Donations", "grants": "Grants",
        "fundraising": "Fundraising", "other_income": "Other Income",
        "salaries": "Salaries & Wages", "utilities": "Utilities", "rent": "Rent",
        "maintenance": "Maintenance & Repairs", "supplies": "School Supplies",
        "equipment": "Equipment", "textbooks": "Textbooks", "transportation": "Transportation",
        "food_program": "Food Program", "medical": "Medical", "training": "Training & Development",
        "insurance": "Insurance", "administrative": "Administrative", "other_expenses": "Other Expenses"
    }
    
    @staticmethod
    def get_schema() -> Dict[str, Any]:
        return {"transaction_date": "Date", "amount": "Decimal", "transaction_type": "String", "category": "String", "sub_category": "String", "description": "String", "reference_number": "String", "payment_method": "String", "recorded_by": "ObjectId", "approved_by": "ObjectId", "approval_status": "String", "approval_date": "DateTime", "rejection_reason": "String", "receipt_url": "String", "related_student_id": "ObjectId", "academic_year": "String", "term": "String", "currency": "String", "exchange_rate": "Decimal", "notes": "String", "tags": "Array", "attachments": "Array", "created_at": "DateTime", "updated_at": "DateTime"}
    
    @staticmethod
    async def create_indexes(db: AsyncIOMotorDatabase):
        try:
            await db.financial_records.create_index("transaction_date", name="idx_fin_date")
            await db.financial_records.create_index("transaction_type", name="idx_fin_type")
            await db.financial_records.create_index("category", name="idx_fin_category")
            await db.financial_records.create_index("approval_status", name="idx_fin_approval")
            await db.financial_records.create_index("academic_year", name="idx_fin_academic_year")
            await db.financial_records.create_index("term", name="idx_fin_term")
            await db.financial_records.create_index("reference_number", unique=True, sparse=True, name="idx_fin_reference")
            await db.financial_records.create_index([("transaction_type", 1), ("category", 1), ("transaction_date", -1)], name="idx_fin_type_category_date")
            await db.fee_structures.create_index([("class_id", 1), ("academic_year", 1), ("student_type", 1)], unique=True, name="idx_fee_class_year_type")
            await db.fee_structures.create_index("academic_year", name="idx_fee_year")
            await db.fee_structures.create_index("status", name="idx_fee_status")
            await db.payments.create_index("student_id", name="idx_pay_student")
            await db.payments.create_index("payment_date", name="idx_pay_date")
            await db.payments.create_index("status", name="idx_pay_status")
            await db.payments.create_index("academic_year", name="idx_pay_year")
            await db.payments.create_index("receipt_number", unique=True, sparse=True, name="idx_pay_receipt")
            await db.payments.create_index([("student_id", 1), ("academic_year", 1), ("term", 1)], name="idx_pay_student_year_term")
            await db.budgets.create_index("academic_year", name="idx_budget_year")
            await db.budgets.create_index("status", name="idx_budget_status")
            await db.budgets.create_index([("academic_year", 1), ("category", 1)], unique=True, name="idx_budget_year_category")
            logger.info("Financial collection indexes created successfully")
        except Exception as e:
            logger.error(f"Failed to create financial indexes: {e}")
            raise

    @staticmethod
    async def create_transaction(db: AsyncIOMotorDatabase, transaction_date: Union[date, str], amount: Union[Decimal, float, int], transaction_type: str, category: str, description: str, recorded_by: str, payment_method: Optional[str] = None, sub_category: Optional[str] = None, related_student_id: Optional[str] = None, academic_year: Optional[str] = None, term: Optional[str] = None, currency: str = "SSP", exchange_rate: Optional[float] = None, notes: Optional[str] = None, tags: Optional[List[str]] = None, receipt_url: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        if transaction_type not in FinancialModel.TRANSACTION_TYPES: return False, f"Invalid transaction type", None
        valid_categories = FinancialModel.INCOME_CATEGORIES if transaction_type == "income" else FinancialModel.EXPENSE_CATEGORIES
        if category not in valid_categories: return False, f"Invalid category for {transaction_type}", None
        if isinstance(amount, (int, float)): amount = Decimal(str(amount))
        if amount <= 0: return False, "Amount must be greater than zero", None
        if isinstance(transaction_date, str):
            try: transaction_date = datetime.strptime(transaction_date, "%Y-%m-%d").date()
            except ValueError: return False, "Invalid date format", None
        if transaction_date > date.today(): return False, "Transaction date cannot be in the future", None
        if not academic_year: academic_year = FinancialModel._get_current_academic_year()
        if not term: term = FinancialModel._get_current_term()
        reference_number = await FinancialModel._generate_reference_number(db, transaction_type)
        transaction = {"transaction_date": datetime.combine(transaction_date, datetime.min.time()), "amount": float(amount), "transaction_type": transaction_type, "category": category, "sub_category": sub_category, "description": description.strip(), "reference_number": reference_number, "payment_method": payment_method, "recorded_by": ObjectId(recorded_by), "approved_by": None, "approval_status": "pending", "approval_date": None, "rejection_reason": None, "receipt_url": receipt_url, "related_student_id": ObjectId(related_student_id) if related_student_id else None, "academic_year": academic_year, "term": term, "currency": currency.upper(), "exchange_rate": exchange_rate, "notes": notes, "tags": tags or [], "attachments": [], "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        transaction = {k: v for k, v in transaction.items() if v is not None}
        try:
            result = await db.financial_records.insert_one(transaction)
            transaction["_id"] = str(result.inserted_id); transaction["recorded_by"] = str(transaction["recorded_by"])
            if transaction.get("related_student_id"): transaction["related_student_id"] = str(transaction["related_student_id"])
            await FinancialModel._log_audit(db, "financial_records", str(result.inserted_id), "INSERT", recorded_by, {"reference_number": reference_number, "amount": float(amount)})
            return True, f"Transaction recorded (Ref: {reference_number})", transaction
        except Exception as e:
            return False, f"Failed to record transaction: {str(e)}", None

    @staticmethod
    async def get_transactions(db: AsyncIOMotorDatabase, transaction_type: Optional[str] = None, category: Optional[str] = None, approval_status: Optional[str] = None, academic_year: Optional[str] = None, term: Optional[str] = None, start_date: Optional[Union[date, str]] = None, end_date: Optional[Union[date, str]] = None, search: Optional[str] = None, limit: int = 50, skip: int = 0, sort_by: str = "transaction_date", sort_order: int = -1) -> Dict[str, Any]:
        filter_query = {}
        if transaction_type: filter_query["transaction_type"] = transaction_type
        if category: filter_query["category"] = category
        if approval_status: filter_query["approval_status"] = approval_status
        if academic_year: filter_query["academic_year"] = academic_year
        if term: filter_query["term"] = term
        if start_date or end_date:
            date_filter = {}
            if start_date:
                if isinstance(start_date, str): start_date = datetime.strptime(start_date, "%Y-%m-%d")
                date_filter["$gte"] = datetime.combine(start_date if isinstance(start_date, date) else start_date.date(), datetime.min.time())
            if end_date:
                if isinstance(end_date, str): end_date = datetime.strptime(end_date, "%Y-%m-%d")
                date_filter["$lte"] = datetime.combine(end_date if isinstance(end_date, date) else end_date.date(), datetime.max.time())
            if date_filter: filter_query["transaction_date"] = date_filter
        if search: filter_query["$or"] = [{"description": {"$regex": search, "$options": "i"}}, {"reference_number": {"$regex": search, "$options": "i"}}, {"category": {"$regex": search, "$options": "i"}}]
        total = await db.financial_records.count_documents(filter_query)
        transactions = await db.financial_records.find(filter_query).sort(sort_by, sort_order).skip(skip).limit(limit).to_list(length=limit)
        for trans in transactions:
            trans["_id"] = str(trans["_id"]); trans["recorded_by"] = str(trans["recorded_by"])
            if trans.get("approved_by"): trans["approved_by"] = str(trans["approved_by"])
            if trans.get("related_student_id"): trans["related_student_id"] = str(trans["related_student_id"])
            trans["category_display"] = FinancialModel.CATEGORY_DISPLAY.get(trans.get("category", ""), trans.get("category", ""))
        return {"transactions": transactions, "total": total, "limit": limit, "skip": skip, "page": (skip // limit) + 1 if limit > 0 else 1, "total_pages": (total + limit - 1) // limit if limit > 0 else 1}

    @staticmethod
    async def get_financial_summary(db: AsyncIOMotorDatabase, academic_year: Optional[str] = None, term: Optional[str] = None, start_date: Optional[date] = None, end_date: Optional[date] = None) -> Dict[str, Any]:
        match_stage = {"approval_status": "approved"}
        if academic_year: match_stage["academic_year"] = academic_year
        if term: match_stage["term"] = term
        if start_date: match_stage["transaction_date"] = {"$gte": datetime.combine(start_date, datetime.min.time())}
        if end_date:
            if "transaction_date" not in match_stage: match_stage["transaction_date"] = {}
            match_stage["transaction_date"]["$lte"] = datetime.combine(end_date, datetime.max.time())
        pipeline = [{"$match": match_stage}, {"$group": {"_id": {"type": "$transaction_type", "category": "$category"}, "total_amount": {"$sum": "$amount"}, "count": {"$sum": 1}}}, {"$group": {"_id": "$_id.type", "categories": {"$push": {"category": "$_id.category", "total": "$total_amount", "count": "$count"}}, "total_amount": {"$sum": "$total_amount"}, "total_count": {"$sum": "$count"}}}]
        results = await db.financial_records.aggregate(pipeline).to_list(length=None)
        summary = {"income": {"total": 0, "count": 0, "categories": []}, "expense": {"total": 0, "count": 0, "categories": []}}
        for result in results:
            trans_type = result["_id"]
            if trans_type in summary:
                summary[trans_type]["total"] = round(result["total_amount"], 2); summary[trans_type]["count"] = result["total_count"]
                summary[trans_type]["categories"] = [{"category": cat["category"], "display": FinancialModel.CATEGORY_DISPLAY.get(cat["category"], cat["category"]), "total": round(cat["total"], 2), "count": cat["count"], "percentage": round((cat["total"] / result["total_amount"] * 100) if result["total_amount"] else 0, 2)} for cat in sorted(result["categories"], key=lambda x: x["total"], reverse=True)]
        total_income = summary["income"]["total"]; total_expense = summary["expense"]["total"]; balance = total_income - total_expense
        return {**summary, "balance": round(balance, 2), "profit_margin": round((balance / total_income * 100) if total_income else 0, 2)}

    @staticmethod
    async def create_fee_structure(db: AsyncIOMotorDatabase, name: str, academic_year: str, class_id: str, student_type: str, fee_items: List[Dict[str, Any]], currency: str = "SSP", due_date: Optional[Union[date, str]] = None, late_fee: float = 0, discount_type: Optional[str] = None, discount_percentage: float = 0, created_by: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc: return False, "Class not found", None
        if not fee_items: return False, "At least one fee item is required", None
        total_amount = Decimal("0"); validated_items = []
        for item in fee_items:
            if not item.get("name") or not item.get("amount"): return False, "Each fee item must have a name and amount", None
            amount = Decimal(str(item["amount"]))
            if amount <= 0: return False, "Fee item amounts must be positive", None
            total_amount += amount
            validated_items.append({"name": item["name"], "amount": float(amount), "description": item.get("description", ""), "is_optional": item.get("is_optional", False)})
        if discount_percentage > 0: total_amount -= total_amount * (Decimal(str(discount_percentage)) / 100)
        if due_date and isinstance(due_date, str):
            try: due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
            except ValueError: return False, "Invalid due date format", None
        fee_structure = {"name": name, "academic_year": academic_year, "class_id": ObjectId(class_id), "class_name": class_doc["class_name"], "student_type": student_type, "fee_items": validated_items, "total_amount": float(total_amount), "currency": currency.upper(), "due_date": datetime.combine(due_date, datetime.min.time()) if due_date else None, "late_fee": late_fee, "discount_type": discount_type, "discount_percentage": discount_percentage, "status": "active", "created_by": ObjectId(created_by) if created_by else None, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        try:
            result = await db.fee_structures.insert_one(fee_structure)
            fee_structure["_id"] = str(result.inserted_id); fee_structure["class_id"] = str(fee_structure["class_id"])
            await db.fee_structures.update_many({"_id": {"$ne": result.inserted_id}, "class_id": ObjectId(class_id), "academic_year": academic_year, "student_type": student_type}, {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}})
            return True, "Fee structure created", fee_structure
        except Exception as e:
            return False, f"Failed to create fee structure: {str(e)}", None

    @staticmethod
    async def record_payment(db: AsyncIOMotorDatabase, student_id: str, fee_structure_id: str, amount_paid: Union[Decimal, float, int], payment_method: str, paid_by: str, recorded_by: str, transaction_reference: Optional[str] = None, academic_year: Optional[str] = None, term: Optional[str] = None, notes: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if not student: return False, "Student not found", None
        if payment_method not in FinancialModel.PAYMENT_METHODS: return False, f"Invalid payment method", None
        if isinstance(amount_paid, (int, float)): amount_paid = Decimal(str(amount_paid))
        if amount_paid <= 0: return False, "Payment amount must be greater than zero", None
        if not academic_year: academic_year = FinancialModel._get_current_academic_year()
        if not term: term = FinancialModel._get_current_term()
        receipt_number = await FinancialModel._generate_receipt_number(db)
        payment = {"student_id": ObjectId(student_id), "student_name": f"{student['first_name']} {student['last_name']}", "amount_paid": float(amount_paid), "payment_date": datetime.utcnow(), "payment_method": payment_method, "transaction_reference": transaction_reference, "receipt_number": receipt_number, "status": "completed", "paid_by": paid_by, "recorded_by": ObjectId(recorded_by), "verified_by": None, "academic_year": academic_year, "term": term, "notes": notes, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        try:
            result = await db.payments.insert_one(payment)
            payment["_id"] = str(result.inserted_id); payment["student_id"] = str(payment["student_id"]); payment["recorded_by"] = str(payment["recorded_by"])
            logger.info(f"Payment recorded: {receipt_number}")
            return True, f"Payment recorded (Receipt: {receipt_number})", payment
        except Exception as e:
            return False, f"Failed to record payment: {str(e)}", None

    @staticmethod
    async def get_student_payments(db: AsyncIOMotorDatabase, student_id: str, academic_year: Optional[str] = None, term: Optional[str] = None) -> Dict[str, Any]:
        filter_query = {"student_id": ObjectId(student_id)}
        if academic_year: filter_query["academic_year"] = academic_year
        if term: filter_query["term"] = term
        payments = await db.payments.find(filter_query).sort("payment_date", -1).to_list(length=None)
        for payment in payments:
            payment["_id"] = str(payment["_id"]); payment["student_id"] = str(payment["student_id"]); payment["recorded_by"] = str(payment["recorded_by"])
            if payment.get("verified_by"): payment["verified_by"] = str(payment["verified_by"])
        total_paid = sum(p["amount_paid"] for p in payments)
        return {"payments": payments, "total_payments": len(payments), "total_amount_paid": round(total_paid, 2)}

    @staticmethod
    async def get_payment_summary(db: AsyncIOMotorDatabase, academic_year: Optional[str] = None, term: Optional[str] = None, class_id: Optional[str] = None) -> Dict[str, Any]:
        match_stage = {}
        if academic_year: match_stage["academic_year"] = academic_year
        if term: match_stage["term"] = term
        if match_stage:
            pipeline = [{"$match": match_stage}, {"$group": {"_id": None, "total_collected": {"$sum": "$amount_paid"}, "total_payments": {"$sum": 1}, "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}}, "partial": {"$sum": {"$cond": [{"$eq": ["$status", "partial"]}, 1, 0]}}}}]
            results = await db.payments.aggregate(pipeline).to_list(length=1)
            if results:
                summary = results[0]
                return {"total_collected": round(summary.get("total_collected", 0), 2), "total_payments": summary.get("total_payments", 0), "completed": summary.get("completed", 0), "partial": summary.get("partial", 0)}
        return {"total_collected": 0, "total_payments": 0, "completed": 0, "partial": 0}

    @staticmethod
    async def create_budget(db: AsyncIOMotorDatabase, academic_year: str, category: str, allocated_amount: Union[Decimal, float, int], created_by: str, description: Optional[str] = None, term_breakdown: Optional[Dict[str, float]] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        if isinstance(allocated_amount, (int, float)): allocated_amount = Decimal(str(allocated_amount))
        if allocated_amount <= 0: return False, "Budget amount must be greater than zero", None
        budget = {"academic_year": academic_year, "category": category, "category_display": FinancialModel.CATEGORY_DISPLAY.get(category, category), "allocated_amount": float(allocated_amount), "spent_amount": 0, "remaining_amount": float(allocated_amount), "description": description, "term_breakdown": term_breakdown or {"Term 1": float(allocated_amount) / 3, "Term 2": float(allocated_amount) / 3, "Term 3": float(allocated_amount) / 3}, "status": "active", "created_by": ObjectId(created_by), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        try:
            result = await db.budgets.update_one({"academic_year": academic_year, "category": category}, {"$set": budget}, upsert=True)
            if result.upserted_id: budget["_id"] = str(result.upserted_id); message = "Budget created"
            else: budget["_id"] = str((await db.budgets.find_one({"academic_year": academic_year, "category": category}))["_id"]); message = "Budget updated"
            return True, message, budget
        except Exception as e:
            return False, f"Failed to manage budget: {str(e)}", None

    @staticmethod
    async def get_budget_summary(db: AsyncIOMotorDatabase, academic_year: Optional[str] = None) -> Dict[str, Any]:
        if not academic_year: academic_year = FinancialModel._get_current_academic_year()
        budgets = await db.budgets.find({"academic_year": academic_year, "status": "active"}).to_list(length=None)
        expense_aggregation = await db.financial_records.aggregate([{"$match": {"academic_year": academic_year, "transaction_type": "expense", "approval_status": "approved"}}, {"$group": {"_id": "$category", "total_spent": {"$sum": "$amount"}, "count": {"$sum": 1}}}]).to_list(length=None)
        expense_lookup = {item["_id"]: item["total_spent"] for item in expense_aggregation}
        budget_summary = []; total_budget = 0; total_spent = 0
        for budget in budgets:
            budget["_id"] = str(budget["_id"]); spent = expense_lookup.get(budget["category"], 0); remaining = budget["allocated_amount"] - spent
            budget_summary.append({"category": budget["category"], "display": budget.get("category_display", budget["category"]), "allocated": budget["allocated_amount"], "spent": round(spent, 2), "remaining": round(remaining, 2), "utilization_percentage": round((spent / budget["allocated_amount"] * 100) if budget["allocated_amount"] else 0, 2)})
            total_budget += budget["allocated_amount"]; total_spent += spent
        return {"academic_year": academic_year, "total_budget": round(total_budget, 2), "total_spent": round(total_spent, 2), "total_remaining": round(total_budget - total_spent, 2), "overall_utilization": round((total_spent / total_budget * 100) if total_budget else 0, 2), "categories": budget_summary}

    @staticmethod
    async def _generate_reference_number(db: AsyncIOMotorDatabase, transaction_type: str) -> str:
        prefix = "INC" if transaction_type == "income" else "EXP"; date_part = datetime.now().strftime("%Y%m%d")
        today_start = datetime.combine(date.today(), datetime.min.time())
        count = await db.financial_records.count_documents({"created_at": {"$gte": today_start}, "transaction_type": transaction_type})
        return f"{prefix}-{date_part}-{(count + 1):04d}"

    @staticmethod
    async def _generate_receipt_number(db: AsyncIOMotorDatabase) -> str:
        date_part = datetime.now().strftime("%Y%m%d")
        today_start = datetime.combine(date.today(), datetime.min.time())
        count = await db.payments.count_documents({"created_at": {"$gte": today_start}})
        return f"RCP-{date_part}-{(count + 1):04d}"

    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    def _get_current_term() -> str:
        """Get current academic term - South Sudan calendar"""
        month = datetime.now().month
        if 2 <= month <= 4: return "Term 1"
        elif 5 <= month <= 7: return "Term 2"
        elif 9 <= month <= 11: return "Term 3"
        elif month == 8: return "Term 2 Break"
        else: return "Annual Break"
    
    @staticmethod
    def _get_current_academic_year() -> str:
        """Get current academic year - South Sudan calendar"""
        now = datetime.now()
        year = now.year; month = now.month
        start_year = year - 1 if month == 1 else year
        return f"{start_year}/{start_year + 1}"
    
    @staticmethod
    async def _log_audit(db: AsyncIOMotorDatabase, table_name: str, record_id: str, operation: str, changed_by: Optional[str], details: Dict[str, Any]):
        try:
            await db.audit_log.insert_one({"table_name": table_name, "record_id": record_id, "operation": operation, "changed_by": ObjectId(changed_by) if changed_by else None, "new_values": details, "changed_at": datetime.utcnow(), "academic_year": FinancialModel._get_current_academic_year(), "term": FinancialModel._get_current_term()})
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")
