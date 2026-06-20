"""Student Schemas"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, Field, validator, model_validator


class GuardianCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    relationship: str = "Guardian"
    phone_number: str = Field(..., max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    occupation: Optional[str] = None
    is_primary_contact: bool = False


class EmergencyContact(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    phone_number: Optional[str] = None


class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    middle_name: Optional[str] = None
    gender: str = "Male"
    date_of_birth: date
    place_of_birth: Optional[str] = None
    nationality: str = "South Sudanese"
    student_type: str = "other"
    current_class_id: Optional[str] = None
    medical_notes: Optional[str] = None
    special_needs: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[Dict[str, str]] = None
    
    @validator('gender')
    def validate_gender(cls, v):
        if v not in ['Male', 'Female', 'Other']:
            raise ValueError('Invalid gender')
        return v
    
    @validator('student_type')
    def validate_student_type(cls, v):
        if v not in ['street', 'abundant', 'orphan', 'other']:
            raise ValueError('Invalid student type')
        return v
    
    @validator('date_of_birth')
    def validate_age(cls, v):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 3:
            raise ValueError(f'Student must be at least 3 years old')
        return v


class StudentCreate(StudentBase):
    enrollment_date: Optional[date] = None
    photo_url: Optional[str] = None
    guardians: Optional[List[GuardianCreate]] = None
    documents: Optional[List[Dict[str, str]]] = None


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    student_type: Optional[str] = None
    current_class_id: Optional[str] = None
    status: Optional[str] = None
    medical_notes: Optional[str] = None
    special_needs: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None


class StudentResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    student_id_number: Optional[str] = None
    first_name: str = ""
    last_name: str = ""
    middle_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    student_type: Optional[str] = None
    current_class_id: Optional[str] = None
    class_name: Optional[str] = None
    status: Optional[str] = "active"
    photo_url: Optional[str] = None
    enrollment_date: Optional[date] = None
    age: Optional[int] = None
    
    class Config:
        populate_by_name = True
        from_attributes = True
    
    @property
    def full_name(self) -> str:
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"


class StudentDetailResponse(StudentResponse):
    place_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    medical_notes: Optional[str] = None
    special_needs: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[Dict[str, str]] = None
    guardians: List[Dict[str, Any]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StudentListResponse(BaseModel):
    students: List[StudentResponse] = []
    total: int = 0
    limit: int = 20
    skip: int = 0
    page: int = 1
    total_pages: int = 0


class StudentPromotionRequest(BaseModel):
    from_class_id: str
    to_class_id: Optional[str] = None
    student_ids: Optional[List[str]] = None
    promote_all: bool = False
    academic_year: Optional[str] = None


class StudentStatisticsResponse(BaseModel):
    total_students: int = 0
    by_gender: Dict[str, int] = {}
    by_type: Dict[str, int] = {}
    by_status: Dict[str, int] = {}
    enrollment_trend: List[Dict[str, Any]] = []
