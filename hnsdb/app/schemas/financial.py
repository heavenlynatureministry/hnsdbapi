"""Financial Schemas"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, validator

class TransactionCreate(BaseModel):
    transaction_date: date
    amount: float
    transaction_type: str
    category: str
    description: str
    payment_method: Optional[str] = None
    academic_year: Optional[str] = None
    term: Optional[str] = None
    currency: str = "SSP"
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    receipt_url: Optional[str] = None
    
    @validator('transaction_type')
    def validate_type(cls, v):
        if v not in ['income', 'expense']:
            raise ValueError('Must be income or expense')
        return v

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    notes: Optional[str] = None

class TransactionApproval(BaseModel):
    transaction_id: str
    is_approved: bool
    rejection_reason: Optional[str] = None

class TransactionResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    transaction_date: Optional[date] = None
    amount: float = 0.0
    transaction_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    reference_number: Optional[str] = None
    approval_status: str = "pending"
    academic_year: Optional[str] = None
    term: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

class TransactionListResponse(BaseModel):
    transactions: List[Dict[str, Any]] = []
    total: int = 0
    limit: int = 20
    skip: int = 0
    page: int = 1
    total_pages: int = 0

class FeeItem(BaseModel):
    name: str
    amount: float
    description: Optional[str] = None
    is_optional: bool = False

class FeeStructureCreate(BaseModel):
    name: str
    academic_year: str
    class_id: str
    student_type: str = "all"
    fee_items: List[FeeItem]
    currency: str = "SSP"
    due_date: Optional[date] = None
    late_fee: float = 0.0

class FeeStructureResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str = ""
    academic_year: Optional[str] = None
    class_id: Optional[str] = None
    total_amount: float = 0.0
    currency: str = "SSP"
    status: str = "active"
    
    class Config:
        populate_by_name = True

class PaymentCreate(BaseModel):
    student_id: str
    fee_structure_id: str
    amount_paid: float
    payment_method: str = "cash"
    paid_by: str
    transaction_reference: Optional[str] = None
    academic_year: Optional[str] = None
    term: Optional[str] = None
    notes: Optional[str] = None

class PaymentVerification(BaseModel):
    payment_id: str
    is_verified: bool = True
    verification_notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    amount_paid: float = 0.0
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    receipt_number: Optional[str] = None
    status: str = "pending"
    academic_year: Optional[str] = None
    term: Optional[str] = None
    
    class Config:
        populate_by_name = True

class PaymentHistory(BaseModel):
    payments: List[Dict[str, Any]] = []
    total_payments: int = 0
    total_amount_paid: float = 0.0
    outstanding_balance: float = 0.0

class PaymentSummary(BaseModel):
    total_collected: float = 0.0
    total_payments: int = 0
    completed: int = 0
    partial: int = 0
    by_payment_method: Dict[str, Any] = {}

class BudgetCreate(BaseModel):
    academic_year: str
    category: str
    allocated_amount: float
    description: Optional[str] = None
    term_breakdown: Optional[Dict[str, float]] = None

class BudgetResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    academic_year: Optional[str] = None
    category: Optional[str] = None
    allocated_amount: float = 0.0
    spent_amount: float = 0.0
    remaining_amount: float = 0.0
    status: str = "active"
    
    class Config:
        populate_by_name = True

class BudgetSummaryResponse(BaseModel):
    academic_year: Optional[str] = None
    total_budget: float = 0.0
    total_spent: float = 0.0
    total_remaining: float = 0.0
    categories: List[Dict[str, Any]] = []

class FinancialSummary(BaseModel):
    income: Dict[str, Any] = {}
    expense: Dict[str, Any] = {}
    balance: float = 0.0
    profit_margin: float = 0.0

class FinancialDashboardSummary(BaseModel):
    current_balance: float = 0.0
    total_income_current_term: float = 0.0
    total_expenses_current_term: float = 0.0
    recent_transactions: List[Dict[str, Any]] = []
    pending_approvals: int = 0

class FinancialAlertResponse(BaseModel):
    overdue_payments: List[Dict[str, Any]] = []
    budget_alerts: List[Dict[str, Any]] = []
    pending_approvals_count: int = 0
