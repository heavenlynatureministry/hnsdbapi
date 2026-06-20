# Fix attendance schema
cat > app/schemas/attendance.py << 'PYEOF'
"""Attendance Schemas"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, validator

class AttendanceCreate(BaseModel):
    student_id: str
    class_id: str
    date: date
    status: str = "present"
    notes: Optional[str] = None
    arrival_time: Optional[str] = None
    term: Optional[str] = None
    academic_year: Optional[str] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v not in ['present', 'absent', 'excused', 'late']:
            raise ValueError('Invalid status')
        return v

class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    arrival_time: Optional[str] = None

class AttendanceBulkCreate(BaseModel):
    class_id: str
    date: date
    attendance_data: List[Dict[str, Any]]
    term: Optional[str] = None
    academic_year: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    student_id: Optional[str] = None
    class_id: Optional[str] = None
    date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    recorded_by: Optional[str] = None
    term: Optional[str] = None
    academic_year: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        from_attributes = True

class StudentAttendanceRecord(BaseModel):
    student_id: str
    student_name: str = ""
    status: str = "unmarked"
    status_display: str = "Not Marked"
    notes: Optional[str] = None
    arrival_time: Optional[str] = None
    recorded: bool = False

class ClassAttendanceResponse(BaseModel):
    class_id: str
    date: Optional[date] = None
    students: List[Dict[str, Any]] = []
    statistics: Dict[str, Any] = {}

class AttendanceStatistics(BaseModel):
    total_records: int = 0
    present: int = 0
    absent: int = 0
    excused: int = 0
    late: int = 0
    attendance_rate: float = 0.0

class StudentAttendanceSummary(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    records: List[Dict[str, Any]] = []
    total: int = 0
    summary: Optional[Dict[str, Any]] = None

class AttendanceReportParams(BaseModel):
    class_id: Optional[str] = None
    student_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    term: Optional[str] = None
    academic_year: Optional[str] = None
    group_by: str = "daily"

class AttendanceReportResponse(BaseModel):
    status_summary: Dict[str, Any] = {}
    total_records: int = 0
    daily_trend: List[Dict[str, Any]] = []
    attendance_rate: float = 0.0

class AttendanceListResponse(BaseModel):
    records: List[Dict[str, Any]] = []
    total: int = 0
    limit: int = 20
    skip: int = 0
    page: int = 1
    total_pages: int = 0

class AttendanceBulkResponse(BaseModel):
    successful: int = 0
    failed: int = 0
    errors: List[str] = []
    message: str = ""

class ExcuseVerificationRequest(BaseModel):
    attendance_id: str
    is_verified: bool = True
    verification_notes: Optional[str] = None

class MonthlyAttendanceSummary(BaseModel):
    month: str
    total_school_days: int = 0
    total_present: int = 0
    total_absent: int = 0
    total_excused: int = 0
    total_late: int = 0
    attendance_rate: float = 0.0

class ConsecutiveAbsenceAlert(BaseModel):
    student_id: str
    student_name: str = ""
    consecutive_absences: int = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    alert_level: str = "info"

class AttendanceAnalytics(BaseModel):
    overall_rate: float = 0.0
    by_term: Dict[str, float] = {}
    by_month: Dict[str, float] = {}
    by_day_of_week: Dict[str, float] = {}
    by_class: List[Dict[str, Any]] = []
    chronic_absentees: List[Dict[str, Any]] = []
    perfect_attendance: List[Dict[str, Any]] = []
    trends: List[Dict[str, Any]] = []

class AttendanceClassComparison(BaseModel):
    classes: List[Dict[str, Any]] = []
    best_class: Optional[Dict[str, Any]] = None
    worst_class: Optional[Dict[str, Any]] = None
    average_attendance_rate: float = 0.0

class AttendanceHeatmapData(BaseModel):
    student_id: str
    student_name: str = ""
    daily_status: Dict[str, str] = {}
    attendance_percentage: float = 0.0
PYEOF

# Fix exam schema
cat > app/schemas/exam.py << 'PYEOF'
"""Exam Schemas"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, validator

class SubjectCreate(BaseModel):
    subject_name: str
    curriculum_level: str = "primary"
    category: Optional[str] = None
    description: Optional[str] = None
    subject_code: Optional[str] = None

class SubjectResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    subject_name: str = ""
    subject_code: Optional[str] = None
    curriculum_level: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"
    
    class Config:
        populate_by_name = True

class ClassSubjectAssign(BaseModel):
    class_id: str
    subject_id: str
    teacher_id: str
    academic_year: Optional[str] = None

class ExamCreate(BaseModel):
    exam_name: str
    exam_type: str = "mid_term"
    class_id: str
    subject_id: str
    exam_date: date
    max_score: float = 100.0
    pass_mark: Optional[float] = None
    weight: float = 1.0
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    academic_year: Optional[str] = None
    term: Optional[str] = None
    instructions: Optional[str] = None
    grading_system_id: Optional[str] = None

class ExamUpdate(BaseModel):
    exam_name: Optional[str] = None
    exam_date: Optional[date] = None
    max_score: Optional[float] = None
    status: Optional[str] = None

class ExamResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    exam_name: str = ""
    exam_type: Optional[str] = None
    class_id: Optional[str] = None
    subject_id: Optional[str] = None
    exam_date: Optional[date] = None
    max_score: float = 100.0
    pass_mark: float = 50.0
    academic_year: Optional[str] = None
    term: Optional[str] = None
    status: str = "scheduled"
    
    class Config:
        populate_by_name = True

class ExamResultCreate(BaseModel):
    exam_id: str
    student_id: str
    score: float
    remarks: Optional[str] = None

class ExamResultBulkCreate(BaseModel):
    exam_id: str
    results: List[Dict[str, Any]]

class ExamResultResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    exam_id: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    score: float = 0.0
    grade: str = ""
    is_passed: bool = False
    percentage: float = 0.0
    
    class Config:
        populate_by_name = True

class GradingSystemCreate(BaseModel):
    name: str
    grade_boundaries: List[Dict[str, Any]]
    description: Optional[str] = None
    is_default: bool = False

class GradingSystemResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str = ""
    grade_boundaries: List[Dict[str, Any]] = []
    is_default: bool = False
    
    class Config:
        populate_by_name = True

class ReportCardResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    academic_year: Optional[str] = None
    term: Optional[str] = None
    subjects: List[Dict[str, Any]] = []
    overall_performance: Dict[str, Any] = {}
    attendance: Dict[str, Any] = {}
    status: str = "draft"
    
    class Config:
        populate_by_name = True

class ReportCardPublishRequest(BaseModel):
    class_id: str
    academic_year: str
    term: str

class ReportCardRemarksUpdate(BaseModel):
    report_card_id: str
    class_teacher_remarks: Optional[str] = None
    head_teacher_remarks: Optional[str] = None

class ClassPerformanceResponse(BaseModel):
    class_id: Optional[str] = None
    academic_year: Optional[str] = None
    term: Optional[str] = None
    total_exams: int = 0
    subjects: List[Dict[str, Any]] = []
    overall: Dict[str, Any] = {}
PYEOF

# Fix financial schema
cat > app/schemas/financial.py << 'PYEOF'
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
PYEOF

# Fix school schema
cat > app/schemas/school.py << 'PYEOF'
"""School Schemas"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, Field

class SchoolInfoUpdate(BaseModel):
    school_name: Optional[str] = None
    motto: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None

class SchoolInfoResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    school_name: str = ""
    motto: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    logo_url: Optional[str] = None
    
    class Config:
        populate_by_name = True

class AcademicCalendarCreate(BaseModel):
    academic_year: str
    terms: List[Dict[str, Any]]
    holidays: Optional[List[Dict[str, Any]]] = None
    important_dates: Optional[List[Dict[str, Any]]] = None

class AcademicCalendarResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    academic_year: Optional[str] = None
    terms: List[Dict[str, Any]] = []
    holidays: List[Dict[str, Any]] = []
    status: str = "active"
    
    class Config:
        populate_by_name = True

class CurrentTermInfo(BaseModel):
    academic_year: Optional[str] = None
    term_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    days_remaining: int = 0

class SchoolDayCheckResponse(BaseModel):
    is_school_day: bool = False
    reason: str = ""
    date: Optional[date] = None

class SchoolEventCreate(BaseModel):
    title: str
    event_type: str = "other"
    start_date: datetime
    end_date: datetime
    description: Optional[str] = None
    location: Optional[str] = None
    organizer: Optional[str] = None

class SchoolEventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = None
    status: Optional[str] = None

class SchoolEventResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    title: str = ""
    event_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    status: str = "upcoming"
    
    class Config:
        populate_by_name = True

class SchoolEventListResponse(BaseModel):
    events: List[Dict[str, Any]] = []
    total: int = 0

class BoardMemberCreate(BaseModel):
    first_name: str
    last_name: str
    position: str
    phone_number: str
    email: Optional[EmailStr] = None

class BoardMemberResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    first_name: str = ""
    last_name: str = ""
    position: Optional[str] = None
    status: str = "active"
    
    class Config:
        populate_by_name = True

class NetworkMembershipCreate(BaseModel):
    organization_name: str
    membership_type: str
    contact_person: str
    contact_email: EmailStr
    contact_phone: str

class NetworkMembershipResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    organization_name: str = ""
    membership_type: Optional[str] = None
    contact_person: Optional[str] = None
    status: str = "active"
    
    class Config:
        populate_by_name = True

class StrategicPlanCreate(BaseModel):
    year_from: int
    year_to: int
    thematic_areas: List[Dict[str, Any]]
    description: Optional[str] = None

class StrategicPlanResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    year_from: int = 0
    year_to: int = 0
    total_budget: float = 0.0
    status: str = "active"
    progress_percentage: float = 0.0
    
    class Config:
        populate_by_name = True

class SystemSettingUpdate(BaseModel):
    setting_key: str
    setting_value: Any
    setting_group: str = "general"

class SystemSettingResponse(BaseModel):
    setting_key: str
    setting_value: Any
    setting_group: str = "general"

class DashboardStatistics(BaseModel):
    students: Dict[str, Any] = {}
    staff: Dict[str, Any] = {}
    attendance: Dict[str, Any] = {}
    events: Dict[str, Any] = {}
    financial: Dict[str, Any] = {}

class AcademicYearTransition(BaseModel):
    from_year: str
    to_year: str
    promote_students: bool = True
    create_classes: bool = True
    archive_data: bool = True

class SchoolReportParams(BaseModel):
    report_type: str
    academic_year: Optional[str] = None
    term: Optional[str] = None
    format: str = "pdf"
PYEOF

echo "✅ All schemas fixed!"
