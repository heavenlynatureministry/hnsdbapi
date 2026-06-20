"""Teacher Schemas"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, Field, validator


class TeacherCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    gender: str = "Male"
    date_of_birth: date
    qualification: str = "Diploma"
    hire_date: date
    phone_number: str
    email: EmailStr
    specialization: Optional[str] = None
    subjects: Optional[List[str]] = None
    address: Optional[str] = None
    years_of_experience: int = 0
    photo_url: Optional[str] = None
    
    @validator('gender')
    def validate_gender(cls, v):
        if v not in ['Male', 'Female', 'Other']:
            raise ValueError('Invalid gender')
        return v


class TeacherUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    status: Optional[str] = None
    address: Optional[str] = None


class TeacherResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    employee_id: Optional[str] = None
    first_name: str = ""
    last_name: str = ""
    gender: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    subjects: List[str] = []
    phone_number: Optional[str] = None
    email: Optional[str] = None
    hire_date: Optional[date] = None
    status: str = "active"
    photo_url: Optional[str] = None
    
    class Config:
        populate_by_name = True
        from_attributes = True
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class TeacherDetailResponse(TeacherResponse):
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = None
    address: Optional[str] = None
    years_of_experience: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TeacherListResponse(BaseModel):
    teachers: List[TeacherResponse] = []
    total: int = 0
    limit: int = 20
    skip: int = 0
    page: int = 1
    total_pages: int = 0


class TeacherSubjectAssign(BaseModel):
    teacher_id: str
    subjects: List[str]


class TeacherClassAssignment(BaseModel):
    teacher_id: str
    class_ids: List[str]
    is_class_teacher: Optional[str] = None


class PerformanceReviewCreate(BaseModel):
    teacher_id: str
    review_date: date
    reviewer: str
    rating: float = Field(..., ge=1, le=5)
    strengths: List[str]
    areas_for_improvement: List[str]
    overall_comments: str


class TrainingRecordCreate(BaseModel):
    teacher_id: str
    training_name: str
    provider: str
    start_date: date
    end_date: Optional[date] = None
    certificate_url: Optional[str] = None
    description: Optional[str] = None


class TeacherLeaveRequest(BaseModel):
    teacher_id: str
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    substitute_teacher_id: Optional[str] = None


class TeacherStatisticsResponse(BaseModel):
    total_active_teachers: int = 0
    by_status: Dict[str, int] = {}
    by_qualification: Dict[str, int] = {}
    by_specialization: Dict[str, int] = {}
    average_experience: float = 0.0
