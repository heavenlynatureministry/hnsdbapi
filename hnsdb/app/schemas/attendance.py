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
