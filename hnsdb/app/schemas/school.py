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
